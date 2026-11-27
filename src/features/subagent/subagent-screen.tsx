import { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { ConversationDisclosureContext, useConversationDisclosuresState } from '@/components/conversation-disclosure'
import { conversationRowKey } from '@/components/conversation-flow'
import { NativeTurnStatus } from '@/components/native-conversation-status'
import { NativeDeliverablesRow } from '@/components/native-deliverables-row'
import { NativeEmptyState } from '@/components/native-empty-state'
import { NativeIcon } from '@/components/native-icon'
import { NativeProcessGroup } from '@/components/native-process-group'
import { NativeTurnGroup } from '@/components/native-turn-group'
import { NativeTurnTriggerRow } from '@/components/native-turn-trigger-row'
import { firstParam, withErrorContext } from '@/components/route-params'
import { backToSession } from '@/components/session-back'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { MessageRow } from '@/components/session-message-row'
import type { NativeProcessRow } from '@/components/session-process-logic'
import { ErrorNotice } from '@/components/session-screen-state'
import type { NativeTurnMemberRow } from '@/components/session-turn-logic'
import { WorkspaceComposer } from '@/components/workspace-composer'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import {
  CONVERSATION_GAP_STYLES,
  useConversationTranscript,
  type TranscriptListEntry,
} from '@/hooks/use-conversation-transcript'
import { useScreenActive } from '@/hooks/use-screen-active'
import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Renders one desktop-owned direct child without treating the child as an ordinary root session. */
export default function SubagentSessionScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { sessionId, parentSessionId, mode } = useLocalSearchParams<{
    sessionId?: string | string[]
    parentSessionId?: string | string[]
    mode?: string | string[]
  }>()
  const childId = firstParam(sessionId)
  const parentId = firstParam(parentSessionId)
  const childMode =
    firstParam(mode) === 'continuable' ? 'continuable' : firstParam(mode) === 'one-shot' ? 'one-shot' : undefined
  const connection = useConnectionStore((state) => state.connection)
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const queryClient = useQueryClient()
  const active = useScreenActive()
  const insets = useSafeAreaInsets()
  const ready = client !== undefined && childId !== undefined && parentId !== undefined && childMode !== undefined
  const oneShotDoneRef = useRef(false)
  const history = useQuery({
    queryKey: queryKeys.subagentHistory(parentId, childId, childMode),
    enabled: ready && active,
    refetchInterval: () => (active && !oneShotDoneRef.current ? 2_500 : false),
    refetchIntervalInBackground: false,
    queryFn: ({ signal }) => {
      if (!client || !parentId || !childId || !childMode) throw new Error(message('subagent.invalidAddress'))
      return client.withSignal(signal).subagentHistory(parentId, childId, childMode)
    },
  })
  useEffect(() => {
    if (active)
      void queryClient.invalidateQueries({ queryKey: queryKeys.subagentHistory(parentId, childId, childMode) })
  }, [active, parentId, childId, childMode, queryClient])
  // The parent already lists its children by label; reading that same catalog means the
  // header can say which child this page is instead of naming the mode it was opened in.
  const catalog = useQuery({
    queryKey: queryKeys.sessionSubagents(parentId),
    enabled: ready && active,
    queryFn: ({ signal }) => {
      if (!client || !parentId) throw new Error(message('subagent.invalidAddress'))
      return client.withSignal(signal).subagents(parentId)
    },
  })
  const childEntry = catalog.data?.entries.find((entry) => entry.id === childId)
  // A diagnostic entry reports a child the Host cannot describe, so it carries no label.
  const childLabel = childEntry?.kind === 'child' ? childEntry.label : undefined
  const send = useMutation({
    mutationFn: async (content: Parameters<MobileApi['sendSubagentMessage']>[2]) => {
      if (!client || !parentId || !childId) throw new Error(message('subagent.invalidAddress'))
      return client.sendSubagentMessage(parentId, childId, content)
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.subagentHistory(parentId, childId, childMode) }),
    onError: (error) =>
      Alert.alert(message('subagent.sendFailedTitle'), withErrorContext(message('subagent.sendFailedBody'), error)),
  })
  const interrupt = useMutation({
    mutationFn: async () => {
      if (!client || !parentId || !childId) throw new Error(message('subagent.invalidAddress'))
      return client.interruptSubagent(parentId, childId)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSubagents(parentId) }),
    onError: (error) =>
      Alert.alert(message('subagent.stopFailedTitle'), withErrorContext(message('subagent.stopFailedBody'), error)),
  })
  const settings = useQuery({
    queryKey: queryKeys.settings(connection?.gatewayUrl, connection?.deviceId),
    enabled: client !== undefined && active,
    staleTime: 60_000,
    queryFn: ({ signal }) => {
      if (client === undefined) throw new Error(message('subagent.invalidAddress'))
      return client.withSignal(signal).settingsDescribe()
    },
  })
  const sourceItems = useMemo(() => history.data?.items ?? [], [history.data?.items])
  const { policy, entries, runningTurnStartedAt, showRunningDivider } = useConversationTranscript(
    sourceItems,
    settings.data,
  )
  const oneShotDone =
    childMode === 'one-shot' &&
    childEntry?.kind === 'child' &&
    childEntry.activity !== 'running' &&
    history.data !== undefined &&
    runningTurnStartedAt === undefined
  oneShotDoneRef.current = oneShotDone
  const lastRunningRef = useRef<{ childId: string | undefined; running: boolean } | undefined>(undefined)
  useEffect(() => {
    const isRunning = runningTurnStartedAt !== undefined
    const previous = lastRunningRef.current
    lastRunningRef.current = { childId, running: isRunning }
    if (
      previous !== undefined &&
      previous.childId === childId &&
      previous.running &&
      !isRunning &&
      childMode === 'one-shot' &&
      parentId !== undefined
    ) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSubagents(parentId) })
    }
  }, [childId, childMode, parentId, queryClient, runningTurnStartedAt])
  const disclosures = useConversationDisclosuresState(childId)
  const renderConversationRow = useCallback(
    (row: NativeConversationRow) =>
      row.kind === 'deliverables' ? (
        <NativeDeliverablesRow files={row.files} />
      ) : row.kind === 'turn-trigger' ? (
        <NativeTurnTriggerRow
          contentBlocks={row.contentBlocks}
          rowKey={conversationRowKey(row)}
          source={row.source}
          text={row.text}
          time={row.time}
          trigger={row.trigger}
        />
      ) : (
        <MessageRow
          item={row}
          event={undefined}
          api={undefined}
          sessionId={childId}
          settledReasoningPreview={policy.settledReasoningPreview}
        />
      ),
    [childId, policy.settledReasoningPreview],
  )
  const renderStep = useCallback(
    (row: NativeProcessRow) => <NativeProcessGroup item={row} renderRow={renderConversationRow} />,
    [renderConversationRow],
  )
  const renderTurnMember = useCallback(
    (row: NativeTurnMemberRow) => (row.kind === 'process' ? renderStep(row) : renderConversationRow(row)),
    [renderConversationRow, renderStep],
  )
  const renderEntry = useCallback(
    ({ item }: { item: TranscriptListEntry }) => {
      const { row, gap } = item
      if (row.kind === 'turn' && row.continuation === true) {
        return <NativeTurnGroup gap={gap} item={row} renderRow={renderTurnMember} />
      }
      const content =
        row.kind === 'turn' ? (
          <NativeTurnGroup item={row} renderRow={renderTurnMember} />
        ) : row.kind === 'process' ? (
          renderStep(row)
        ) : (
          renderConversationRow(row)
        )
      return <View style={CONVERSATION_GAP_STYLES[gap]}>{content}</View>
    },
    [renderConversationRow, renderStep, renderTurnMember],
  )
  const keyExtractor = useCallback((item: TranscriptListEntry) => item.key, [])
  const listFooter = useMemo(
    () =>
      runningTurnStartedAt === undefined ? null : (
        <View style={styles.turnStatusSlot}>
          <NativeTurnStatus showDivider={showRunningDivider} startedAt={runningTurnStartedAt} />
        </View>
      ),
    [runningTurnStartedAt, showRunningDivider, styles.turnStatusSlot],
  )
  const listEmpty = useMemo(
    () =>
      history.isPending ? (
        <NativeEmptyState icon="skill-outline" title={message('subagent.loading')} />
      ) : (
        <NativeEmptyState
          description={message('subagent.noMessagesDetail')}
          icon="skill-outline"
          title={message('subagent.noMessages')}
        />
      ),
    [history.isPending],
  )
  const modeTitle = childMode === 'continuable' ? message('subagent.title') : message('subagent.readOnlyTitle')
  // A named child reads as itself; the mode stays as the fallback before the catalog lands.
  const title = childLabel === undefined || childLabel === '' ? modeTitle : childLabel

  return (
    <WorkspaceShell
      title={title}
      showMenu={false}
      leftAction={
        <Pressable
          android_ripple={{ borderless: false }}
          accessibilityRole="button"
          accessibilityLabel={message('common.back')}
          hitSlop={8}
          onPress={() => backToSession(parentId)}
          style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
        >
          <NativeIcon name="chevron-left-outline" color={theme.colors.ink} size={20} />
        </Pressable>
      }
    >
      {!ready ? (
        <Unavailable onBack={() => backToSession(parentId)} text={message('subagent.missingAddress')} />
      ) : (
        <KeyboardAvoidingView
          style={styles.canvas}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={workspaceKeyboardVerticalOffset(insets.top, false)}
        >
          <View style={styles.notice}>
            <NativeIcon name="agent-preset-outline" size={16} color={theme.colors.accentText} />
            <Text style={styles.noticeText}>
              {childMode === 'continuable'
                ? message('subagent.inheritedPermission')
                : message('subagent.oneShotNotice')}
            </Text>
            {childMode === 'continuable' ? (
              <Pressable
                android_ripple={{ borderless: false }}
                accessibilityRole="button"
                accessibilityLabel={message('subagent.stopAction')}
                accessibilityState={{ busy: interrupt.isPending }}
                disabled={interrupt.isPending}
                onPress={() => interrupt.mutate()}
                style={({ pressed }) => [styles.stopAction, pressed && styles.pressed]}
              >
                <NativeIcon name="stop-fill" size={15} color={theme.colors.danger} />
              </Pressable>
            ) : null}
          </View>
          {history.isError ? (
            <ErrorNotice
              text={withErrorContext(message('subagent.loadFailed'), history.error)}
              onRetry={() => void history.refetch()}
            />
          ) : null}
          <ConversationDisclosureContext.Provider value={disclosures}>
            <FlatList
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={9}
              data={entries}
              keyExtractor={keyExtractor}
              renderItem={renderEntry}
              contentContainerStyle={styles.list}
              ListFooterComponent={listFooter}
              ListEmptyComponent={listEmpty}
            />
          </ConversationDisclosureContext.Provider>
          {childMode === 'continuable' ? (
            <WorkspaceComposer
              key={childId ?? 'workspace'}
              draftScope={`subagent:${parentId}:${childId}`}
              disabled={!ready}
              placeholder={message('subagent.composerPlaceholder')}
              onSend={(content) => send.mutateAsync(content).then(() => undefined)}
              sending={send.isPending}
            />
          ) : null}
        </KeyboardAvoidingView>
      )}
    </WorkspaceShell>
  )
}

function Unavailable({ onBack, text }: { onBack: () => void; text: string }): React.JSX.Element {
  return (
    <NativeEmptyState
      action={{
        icon: 'chevron-left-outline',
        label: message('common.back'),
        onPress: onBack,
      }}
      icon="link-off"
      title={text}
    />
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    canvas: { flex: 1 },
    headerAction: {
      alignItems: 'center',
      height: theme.touch.iconButton,
      justifyContent: 'center',
      width: theme.touch.iconButton,
    },
    notice: {
      alignItems: 'center',
      backgroundColor: theme.colors.accentSoft,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    noticeText: { color: theme.colors.inkTertiary, flex: 1, fontSize: 12, lineHeight: 18 },
    stopAction: {
      alignItems: 'center',
      height: theme.touch.iconButton,
      justifyContent: 'center',
      width: theme.touch.iconButton,
    },
    list: { paddingHorizontal: 20, paddingVertical: theme.spacing.lg },
    turnStatusSlot: { paddingBottom: 8, paddingTop: 16 },
    pressed: { opacity: 0.62 },
  })
