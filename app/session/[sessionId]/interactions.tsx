import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { NativeActionButton } from '@/components/native-action-button'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { NativeIcon } from '@/components/native-icon'
import { NativeMarkdown } from '@/components/native-markdown'
import {
  interactionListState,
  questionOptionAccessibility,
  type InteractionListState,
} from '@/components/interaction-state'
import { useConnectionStore } from '@/state/connection'
import { useRouteSessionSelection } from '@/state/session-selection'
import { format, t as message } from '@/locale'
import type {
  DshQuestion,
  PendingApprovalInteraction,
  PendingInteraction,
  PendingQuestionInteraction,
} from '@/types/mobile'

type AnswerDraft = Record<string, { selected: string[]; custom: string }>
type RespondHandler = (rpcId: string, result: unknown) => void

type InteractionCardProps = {
  interaction: PendingInteraction
  submitting: boolean
  onRespond: RespondHandler
}

type ApprovalCardProps = {
  interaction: PendingApprovalInteraction
  submitting: boolean
  onRespond: RespondHandler
}

type QuestionCardProps = {
  interaction: PendingQuestionInteraction
  submitting: boolean
  onRespond: RespondHandler
}

/** Presents current DSH approvals and questions as native, session-scoped controls. */
export default function InteractionsScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  const insets = useSafeAreaInsets()
  useRouteSessionSelection(typeof sessionId === 'string' ? sessionId : undefined)
  const connection = useConnectionStore(state => state.connection)
  const client = connection === undefined ? undefined : new MobileApi(connection)
  const queryClient = useQueryClient()
  const interactions = useQuery({
    queryKey: ['session-interactions', sessionId],
    enabled: client !== undefined && typeof sessionId === 'string' && sessionId.length > 0,
    queryFn: () => requireClient(client).pendingInteractions(requireSessionId(sessionId)),
  })
  const respond = useMutation({
    mutationFn: ({ rpcId, result }: { rpcId: string; result: unknown }) =>
      requireClient(client).respondToInteraction(rpcId, result),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['session-interactions', sessionId] })
      void queryClient.invalidateQueries({ queryKey: ['session-events', sessionId] })
      void queryClient.invalidateQueries({ queryKey: ['session-history', sessionId] })
    },
    onError: error => Alert.alert(message('interactions.respondFailedTitle'), withErrorContext(message('interactions.respondFailedBody'), error)),
  })
  const listState = interactionListState({
    hasConnection: connection !== undefined,
    hasSessionId: typeof sessionId === 'string' && sessionId.length > 0,
    isLoading: interactions.isLoading,
    isError: interactions.isError,
    hasItems: (interactions.data?.items.length ?? 0) > 0,
  })

  return (
    <WorkspaceShell
      title={message('interactions.title')}
      showMenu={false}
      leftAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={message('interactions.backToSession')}
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
        >
          <NativeIcon name="chevron-left-outline" color={theme.colors.ink} size={20} />
        </Pressable>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? workspaceKeyboardVerticalOffset(insets.top, false) : 0}
        style={styles.container}
      >
        <FlatList
          style={styles.container}
          data={interactions.data?.items ?? []}
          keyExtractor={interaction => interaction.rpcId}
          renderItem={({ item }) => (
            <InteractionCard
              interaction={item}
              submitting={respond.isPending}
              onRespond={(rpcId, result) => respond.mutate({ rpcId, result })}
            />
          )}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={interactions.isRefetching}
              onRefresh={() => void interactions.refetch()}
              tintColor={theme.colors.accent}
            />
          }
          ListHeaderComponent={
            <View style={styles.intro}>
              <Text style={styles.title}>{message('interactions.heading')}</Text>
              <Text style={styles.description}>{message('interactions.intro')}</Text>
            </View>
          }
          ListEmptyComponent={<InteractionListStateView query={interactions} state={listState} />}
        />
      </KeyboardAvoidingView>
    </WorkspaceShell>
  )
}

function InteractionListStateView({
  query,
  state,
}: {
  query: { error: Error | null; refetch: () => Promise<unknown> }
  state: InteractionListState
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  if (state === 'ready') return null
  if (state === 'disconnected')
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{message('interactions.notConnected')}</Text>
        <Text style={styles.emptyText}>{message('interactions.notConnectedBody')}</Text>
        <NativeActionButton label={message('interactions.goConnect')} icon="link-outline" onPress={() => router.replace('/connect')} />
      </View>
    )
  if (state === 'invalid-session')
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{message('interactions.invalidSession')}</Text>
        <Text style={styles.emptyText}>{message('interactions.invalidSessionBody')}</Text>
        <NativeActionButton label={message('interactions.backToSession')} icon="chevron-left-outline" variant="secondary" onPress={() => router.back()} />
      </View>
    )
  if (state === 'loading')
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.emptyText}>{message('interactions.loading')}</Text>
      </View>
    )
  if (state === 'error')
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{message('interactions.loadFailedTitle')}</Text>
        <Text style={styles.error}>{withErrorContext(message('interactions.loadFailedBody'), query.error)}</Text>
        <NativeActionButton label={message('common.reload')} icon="refresh-outline" variant="secondary" onPress={() => void query.refetch()} />
      </View>
    )
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{message('interactions.empty')}</Text>
      <Text style={styles.emptyText}>{message('interactions.emptyBody')}</Text>
    </View>
  )
}

function InteractionCard({ interaction, submitting, onRespond }: InteractionCardProps): React.JSX.Element {
  if (interaction.type === 'approval/requested') {
    return <ApprovalCard interaction={interaction} submitting={submitting} onRespond={onRespond} />
  }
  return <QuestionCard interaction={interaction} submitting={submitting} onRespond={onRespond} />
}

function ApprovalCard({ interaction, submitting, onRespond }: ApprovalCardProps): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const { payload } = interaction
  const reason = payload.reason ?? message('interactions.permissionIntro')
  const answer = (outcome: 'allowed-once' | 'rejected') => {
    onRespond(interaction.rpcId, {
      ok: true,
      value: {
        sessionId: interaction.sessionId,
        approvalId: payload.approvalId,
        outcome,
      },
    })
  }
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{message('interactions.permissionRequest')}</Text>
      <Text style={styles.cardTitle}>{payload.toolName}</Text>
      <Text style={styles.body}>{reason}</Text>
      <Text style={styles.metadata}>{format('interactions.requestId', { id: payload.approvalId })}</Text>
      <View style={styles.buttonRow}>
        <NativeActionButton
          label={message('interactions.deny')}
          icon="close-outline"
          variant="danger"
          disabled={submitting}
          onPress={() => answer('rejected')}
          style={styles.approvalButton}
        />
        <NativeActionButton
          label={message('interactions.allowOnce')}
          icon="check-outline"
          disabled={submitting}
          onPress={() => answer('allowed-once')}
          style={styles.approvalButton}
        />
      </View>
    </View>
  )
}

function QuestionCard({ interaction, submitting, onRespond }: QuestionCardProps): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const [draft, setDraft] = useState<AnswerDraft>({})
  const questions = interaction.payload.questions
  const review = planReviewOf(questions)
  if (review !== undefined)
    return <PlanReviewCard interaction={interaction} review={review} submitting={submitting} onRespond={onRespond} />
  // Recomputed per render rather than memoized: this runs after an early return
  // for the plan-review variant, and a hook there would change the hook count
  // between renders. The work is a scan of the question list.
  const complete = questions.every((question) => {
    const answer = draft[question.id]
    return answer !== undefined && (answer.selected.length > 0 || answer.custom.trim() !== '')
  })
  const update = (questionId: string, value: Partial<AnswerDraft[string]>) => {
    setDraft(current => ({
      ...current,
      [questionId]: {
        selected: current[questionId]?.selected ?? [],
        custom: current[questionId]?.custom ?? '',
        ...value,
      },
    }))
  }
  const toggleOption = (question: DshQuestion, label: string) => {
    const selected = draft[question.id]?.selected ?? []
    const nextSelected = question.multiSelect
      ? selected.includes(label)
        ? selected.filter(item => item !== label)
        : [...selected, label]
      : [label]
    update(question.id, { selected: nextSelected })
  }
  const submit = () =>
    onRespond(interaction.rpcId, {
      ok: true,
      value: {
        sessionId: interaction.sessionId,
        answer: {
          answers: questions.map((question) => {
            const answer = draft[question.id] ?? { selected: [], custom: '' }
            return {
              id: question.id,
              selected: answer.selected,
              ...(answer.custom.trim() === '' ? {} : { custom: answer.custom.trim() }),
            }
          }),
        },
      },
    })
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{message('interactions.question')}</Text>
      {questions.map(question => (
        <View key={question.id} style={styles.question}>
          {question.header !== undefined ? <Text style={styles.questionHeader}>{question.header}</Text> : null}
          <Text style={styles.cardTitle}>{question.question}</Text>
          {question.detail !== undefined ? <Text style={styles.body}>{question.detail}</Text> : null}
          {(question.options ?? []).map((option) => {
            const active = (draft[question.id]?.selected ?? []).includes(option.label)
            const accessibility = questionOptionAccessibility({
              multiSelect: question.multiSelect === true,
              selected: active,
              submitting,
            })
            return (
              <Pressable
                key={option.label}
                accessibilityRole={accessibility.role}
                accessibilityLabel={active ? format('interactions.optionSelected', { label: option.label }) : option.label}
                accessibilityState={accessibility.state}
                disabled={accessibility.disabled}
                style={[styles.option, active ? styles.optionActive : undefined]}
                onPress={() => toggleOption(question, option.label)}
              >
                <Text style={[styles.optionLabel, active ? styles.optionLabelActive : undefined]}>{option.label}</Text>
                {option.description !== undefined ? (
                  <Text style={styles.optionDescription}>{option.description}</Text>
                ) : null}
              </Pressable>
            )
          })}
          <TextInput
            accessibilityLabel={format('interactions.customAnswer', { question: question.question })}
            editable={!submitting}
            multiline
            placeholder={message('interactions.customAnswerPlaceholder')}
            style={styles.customAnswer}
            value={draft[question.id]?.custom ?? ''}
            onChangeText={custom => update(question.id, { custom })}
          />
        </View>
      ))}
      <NativeActionButton
        label={submitting ? message('interactions.responding') : message('interactions.respond')}
        icon="paper-plane-outline"
        loading={submitting}
        disabled={!complete}
        onPress={submit}
      />
    </View>
  )
}

type PlanReview = {
  id: string
  question: string
  plan: string
  approve: string
  decline?: string
}

function planReviewOf(questions: DshQuestion[]): PlanReview | undefined {
  if (questions.length !== 1) return undefined
  const question = questions[0]
  if (question === undefined || question.intent?.kind !== 'plan-review' || question.detail === undefined || question.multiSelect === true)
    return undefined
  const options = question.options ?? []
  if (options.length > 2 || question.intent.approve === undefined) return undefined
  const approve = options.find(option => option.label === question.intent?.approve)?.label
  if (approve === undefined) return undefined
  const decline = options.find(option => option.label !== approve)?.label
  return { id: question.id, question: question.question, plan: question.detail, approve, ...(decline === undefined ? {} : { decline }) }
}

function PlanReviewCard({
  interaction,
  review,
  submitting,
  onRespond,
}: {
  interaction: PendingQuestionInteraction
  review: PlanReview
  submitting: boolean
  onRespond: RespondHandler
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const answer = (selected: string) =>
    onRespond(interaction.rpcId, {
      ok: true,
      value: { sessionId: interaction.sessionId, answer: { answers: [{ id: review.id, selected: [selected] }] } },
    })
  const discuss = () =>
    onRespond(interaction.rpcId, {
      ok: false,
      error: { code: 'cancelled', message: 'the user opened plan discussion', details: {} },
    })
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{message('interactions.planReview')}</Text>
      <Text style={styles.cardTitle}>{review.question}</Text>
      <NativeMarkdown markdown={review.plan} />
      <View style={styles.buttonRow}>
        <NativeActionButton
          label={message('interactions.discuss')}
          icon="new-chat-outline"
          variant="secondary"
          disabled={submitting}
          onPress={discuss}
          style={styles.approvalButton}
        />
        {review.decline !== undefined ? (
          <NativeActionButton
            label={review.decline}
            icon="close-outline"
            variant="danger"
            disabled={submitting}
            onPress={() => answer(review.decline as string)}
            style={styles.approvalButton}
          />
        ) : null}
        <NativeActionButton
          label={review.approve}
          icon="check-outline"
          disabled={submitting}
          onPress={() => answer(review.approve)}
          style={styles.approvalButton}
        />
      </View>
    </View>
  )
}

function requireClient(client: MobileApi | undefined): MobileApi {
  if (client === undefined) throw new Error(message('interactions.connectFirst'))
  return client
}

function requireSessionId(sessionId: string | string[] | undefined): string {
  if (typeof sessionId !== 'string' || sessionId.length === 0) throw new Error(message('interactions.missingSession'))
  return sessionId
}

function withErrorContext(prefix: string, error: unknown): string {
  const detail = mobileErrorMessage(error, message('common.retry'))
  return `${prefix}：${detail}`
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1 },
    listContent: { flexGrow: 1, gap: 12, padding: 16, paddingBottom: 28 },
    intro: { gap: 8 },
    headerAction: {
      alignItems: 'center',
      height: theme.touch.iconButton,
      justifyContent: 'center',
      width: theme.touch.iconButton,
    },
    title: { color: theme.colors.ink, fontSize: 28, fontWeight: '700' },
    description: { color: theme.colors.inkMuted, lineHeight: 22 },
    error: { color: theme.colors.danger },
    card: {
      ...theme.elevation.card,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 16,
    },
    kicker: { color: theme.colors.warningText, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    cardTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: '700', lineHeight: 24 },
    body: { color: theme.colors.inkMuted, lineHeight: 22 },
    metadata: { color: theme.colors.inkMuted, fontSize: 12 },
    buttonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    approvalButton: { flex: 1, paddingHorizontal: 8 },
    question: {
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 8,
      paddingTop: 14,
    },
    questionHeader: { color: theme.colors.inkMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    option: {
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.control,
      borderWidth: 1,
      gap: 3,
      padding: 11,
    },
    optionActive: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
    optionLabel: { color: theme.colors.ink, fontWeight: '600' },
    optionLabelActive: { color: theme.colors.accent },
    optionDescription: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 18 },
    customAnswer: {
      borderColor: theme.colors.borderStrong,
      borderRadius: 10,
      borderWidth: 1,
      minHeight: 74,
      padding: 10,
      textAlignVertical: 'top',
    },
    empty: {
      alignItems: 'stretch',
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 18,
    },
    emptyTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: '700', lineHeight: 24 },
    emptyText: { color: theme.colors.inkMuted, lineHeight: 22 },
    pressed: { opacity: 0.62 },
  })
