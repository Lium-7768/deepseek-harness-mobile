import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { NativeActionButton } from '@/components/native-action-button'
import { SkeletonConversation } from '@/components/skeleton'
import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { NativeMarkdown } from '@/components/native-markdown'
import { NativeMessageAttachments } from '@/components/native-message-attachments'
import { NativeMessageFeedback } from '@/components/native-message-feedback'
import { NativeQueueDock } from '@/components/native-queue-dock'
import { NativeAgentActivity, NativeGoalBar, goalFromProjection } from '@/components/native-agent-activity'
import { NativeToolCard } from '@/components/native-tool-card'
import { NativeReasoningRow, NativeRetryRow, NativeTurnErrorRow, NativeTurnStatus, NativeCommandRow, NativeTurnMaxTokensRow, NativeCompactionRow } from '@/components/native-conversation-status'
import {
  activeTurnStartedAt,
  projectNativeConversationRows,
  type NativeConversationRow,
} from '@/components/session-conversation-logic'
import { NativeIcon } from '@/components/native-icon'
import { WorkspaceComposer } from '@/components/workspace-composer'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { ContextRows, TrajectoryPanel, WorkbenchTabs, type WorkbenchTab } from '@/components/session-workbench'
import { readPermissionSelect } from '@/components/session-composer-logic'
import { formatMessageTime, messageActionLayout, type MessageActionAlignment } from '@/components/session-message-logic'
import { sessionStatisticsLine } from '@/components/session-stats-logic'
import { sessionDisplayTitle } from '@/components/session-drawer-logic'
import {
  isNearLatestMessage,
  shouldScrollToLatest,
  shouldShowReturnToLatest,
  shouldTrackLatestProximity,
} from '@/components/session-scroll-logic'
import { useConnectionStore } from '@/state/connection'
import { useRouteSessionSelection } from '@/state/session-selection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobilePromptContent, SessionEventsPayload } from '@/types/mobile'
import { type SharedEventItem } from '@/shared/dsh-presentation'
import { format, t as message } from '@/locale'

export default function SessionScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const { sessionId: rawSessionId, draft } = useLocalSearchParams<{
    sessionId?: string | string[]
    draft?: string | string[]
  }>()
  const sessionId = firstParam(rawSessionId)
  const connection = useConnectionStore(state => state.connection)
  const insets = useSafeAreaInsets()
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const queryClient = useQueryClient()
  const listRef = useRef<FlatList<NativeConversationRow>>(null)
  const submittedDraft = useRef<string | undefined>(undefined)
  const initialLatestPositionPending = useRef(true)
  const nearLatestMessage = useRef(true)
  const [showReturnToLatest, setShowReturnToLatest] = useState(false)
  const [liveItems, setLiveItems] = useState<SharedEventItem[]>([])
  const [olderItems, setOlderItems] = useState<SharedEventItem[]>([])
  const [olderHasMore, setOlderHasMore] = useState<boolean | undefined>()
  const [tab, setTab] = useState<WorkbenchTab>('chat')
  const retrySend = useRef<(content: MobilePromptContent) => void>(() => undefined)
  const ready = Boolean(client && sessionId)
  const history = useQuery({
    queryKey: ['session-history', sessionId],
    enabled: ready,
    queryFn: () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.sessionHistory(sessionId)
    },
  })
  const events = useQuery({
    queryKey: ['session-events', sessionId],
    enabled: ready,
    queryFn: () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.sessionEvents(sessionId, 0)
    },
  })
  const queue = useQuery({
    queryKey: ['session-queue', sessionId],
    enabled: ready,
    queryFn: () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.sessionQueue(sessionId)
    },
  })
  const jobs = useQuery({
    queryKey: ['session-jobs', sessionId],
    enabled: ready,
    queryFn: () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.sessionJobs(sessionId)
    },
  })
  const subagents = useQuery({
    queryKey: ['session-subagents', sessionId],
    enabled: ready,
    queryFn: () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.subagents(sessionId)
    },
  })
  const interactions = useQuery({
    queryKey: ['session-interactions', sessionId],
    enabled: ready,
    queryFn: () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.pendingInteractions(sessionId)
    },
  })
  const sessionList = useQuery({
    queryKey: ['session-list', connection?.gatewayUrl, connection?.deviceId],
    enabled: Boolean(connection),
    queryFn: () => {
      if (!client) throw new Error(message('drawer.connectFirstBody'))
      return client.listSessions()
    },
  })
  const activeSession = useMemo(
    () => sessionList.data?.items.find(item => item.sessionId === sessionId),
    [sessionId, sessionList.data?.items],
  )
  const sessionTitle = sessionDisplayTitle(activeSession)
  const models = useQuery({
    queryKey: ['session-models', connection?.gatewayUrl, connection?.deviceId, sessionId],
    enabled: ready,
    queryFn: () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.sessionModels(sessionId)
    },
  })
  const loadOlder = useMutation({
    mutationFn: async () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      const source = mergeEventItems(history.data?.items ?? [], olderItems)
      const beforeSeq = Math.min(...source.flatMap(item => (typeof item.seq === 'number' ? [item.seq] : [])))
      if (!Number.isFinite(beforeSeq)) throw new Error(message('conversation.noMoreHistory'))
      return client.sessionHistory(sessionId, { beforeSeq, maxMessages: 200 })
    },
    onSuccess: (page) => {
      setOlderItems(current => mergeEventItems(page.items, current))
      setOlderHasMore(page.hasMore ?? false)
    },
    onError: error => Alert.alert(message('conversation.loadOlderFailedTitle'), withErrorContext(message('conversation.historyNotLoaded'), error)),
  })
  const send = useMutation({
    mutationFn: (content: MobilePromptContent) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.sendMessage(sessionId, content)
    },
    onSuccess: () => {
      queryClient.setQueryData<SessionEventsPayload>(['session-events', sessionId], current => ({
        since: current?.since ?? 0,
        items: current?.items ?? [],
        status: 'running',
      }))
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['session-history', sessionId] }),
        queryClient.invalidateQueries({ queryKey: ['session-events', sessionId] }),
        queryClient.invalidateQueries({ queryKey: ['session-queue', sessionId] }),
        queryClient.invalidateQueries({ queryKey: ['session-jobs', sessionId] }),
      ])
    },
    onError: (error, content) =>
      Alert.alert(message('conversation.sendFailedTitle'), withErrorContext(message('conversation.sendFailedBody'), error), [
        { text: message('common.close'), style: 'cancel' },
        { text: message('common.retryAction'), onPress: () => retrySend.current(content) },
      ]),
  })
  retrySend.current = send.mutate
  const updateQueue = useMutation({
    mutationFn: ({ itemId, action }: { itemId: string; action: Record<string, unknown> }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.updateQueue(sessionId, itemId, action)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['session-queue', sessionId] }),
  })
  const cancel = useMutation({
    mutationFn: () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.cancelSession(sessionId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['session-events', sessionId] })
      void queryClient.invalidateQueries({ queryKey: ['session-history', sessionId] })
    },
    onError: error => Alert.alert(message('conversation.stopFailedTitle'), withErrorContext(message('conversation.stopFailedBody'), error)),
  })
  const goalMutation = useMutation({
    mutationFn: ({ action, ref, objective }: { action: 'edit' | 'pause' | 'resume' | 'clear'; ref: { id: string; revision: number }; objective?: string }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.mutateGoal(sessionId, action, ref, objective === undefined ? {} : { objective })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['session-history', sessionId] }),
    onError: error => Alert.alert(message('conversation.goalFailedTitle'), withErrorContext(message('conversation.goalFailedBody'), error)),
  })
  const interruptSubagent = useMutation({
    mutationFn: (childSessionId: string) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.interruptSubagent(sessionId, childSessionId)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['session-subagents', sessionId] }),
    onError: error => Alert.alert(message('conversation.subagentStopFailedTitle'), withErrorContext(message('conversation.subagentStopFailedBody'), error)),
  })
  const sendMessage = useRef(send.mutate)
  sendMessage.current = send.mutate

  useRouteSessionSelection(sessionId)

  useEffect(() => {
    submittedDraft.current = undefined
    initialLatestPositionPending.current = true
    nearLatestMessage.current = true
    setShowReturnToLatest(false)
    setLiveItems([])
    setOlderItems([])
    setOlderHasMore(undefined)
  }, [sessionId])

  useEffect(() => {
    const value = firstParam(draft)
    if (!client || !sessionId || !value || submittedDraft.current === value) return
    submittedDraft.current = value
    sendMessage.current([{ type: 'text', text: value }])
  }, [client, draft, sessionId])

  useEffect(() => {
    if (tab !== 'chat') return
    initialLatestPositionPending.current = true
    nearLatestMessage.current = true
    setShowReturnToLatest(false)
  }, [tab])

  useEffect(() => {
    const incoming = events.data?.items ?? []
    if (!incoming.length) return
    setLiveItems(current => mergeEventItems(current, incoming))
  }, [events.data])

  const sourceItems = useMemo(
    () => mergeEventItems(olderItems, history.data?.items ?? [], liveItems),
    [history.data?.items, liveItems, olderItems],
  )
  const messages = useMemo(() => projectNativeConversationRows(sourceItems), [sourceItems])
  const runningTurnStartedAt = useMemo(() => activeTurnStartedAt(sourceItems), [sourceItems])
  const eventBySeq = useMemo(
    () => new Map(sourceItems.flatMap(item => (typeof item.seq === 'number' ? [[item.seq, item.event] as const] : []))),
    [sourceItems],
  )
  useEffect(() => {
    if (tab !== 'chat' || messages.length === 0 || !initialLatestPositionPending.current) return
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0)
    return () => clearTimeout(timer)
  }, [messages.length, tab])

  const hasMoreHistory = olderHasMore ?? history.data?.hasMore ?? false
  const actions = interactions.data?.items.length ?? 0
  const goal = goalFromProjection(history.data?.projections?.values)
  const reportedStatus = events.data?.status ?? message('conversation.connecting')
  const running = reportedStatus === 'running' || activeSession?.running === true || runningTurnStartedAt !== undefined
  const status = running ? 'running' : reportedStatus
  const displayStatus = connection ? status : 'disconnected'

  return (
    <WorkspaceShell title={sessionTitle} rightAction={<ConnectionStatus status={displayStatus} />}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? workspaceKeyboardVerticalOffset(insets.top, false) : 0}
        style={s.canvas}
      >
        {!connection ? (
          <UnavailableState message={message('drawer.connectFirstBody')} action={message('conversation.goConnect')} onPress={() => router.replace('/connect')} />
        ) : !sessionId ? (
          <UnavailableState
            message={message('conversation.missingSessionId')}
            action={message('conversation.backToWorkspace')}
            onPress={() => router.replace('/workspace')}
          />
        ) : (
          <>
            <WorkbenchTabs tab={tab} onChange={setTab} />
            <NativeGoalBar
              goal={goal}
              pending={goalMutation.isPending}
              onMutate={(action, ref, objective) => goalMutation.mutate({ action, ref, objective })}
            />
            <NativeAgentActivity
              jobs={jobs.data?.items ?? []}
              subagents={subagents.data?.entries ?? []}
              interruptingId={interruptSubagent.isPending ? interruptSubagent.variables : undefined}
              onOpenSubagent={entry =>
                router.push({
                  pathname: '/session/[sessionId]/subagent',
                  params: { sessionId: entry.id, parentSessionId: sessionId, mode: entry.mode },
                })
              }
              onInterruptSubagent={entry => interruptSubagent.mutate(entry.id)}
            />
            {actions > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={message('conversation.viewPending')}
                onPress={() => router.push({ pathname: '/session/[sessionId]/interactions', params: { sessionId } })}
                style={({ pressed }) => [s.action, pressed && s.pressed]}
              >
                <NativeIcon name="warning-triangle-outline" size={18} color={theme.colors.warning} />
                <Text style={s.actionText}>{format('conversation.pendingCount', { count: actions })}</Text>
                <NativeIcon name="chevron-right-outline" size={18} color={theme.colors.inkMuted} />
              </Pressable>
            ) : null}
            {history.isError ? (
              <ErrorNotice
                text={withErrorContext(message('conversation.historyFailed'), history.error)}
                onRetry={() => void history.refetch()}
              />
            ) : null}
            {events.isError ? (
              <ErrorNotice
                text={withErrorContext(message('conversation.eventsFailed'), events.error)}
                onRetry={() => void events.refetch()}
              />
            ) : null}
            {interactions.isError ? (
              <ErrorNotice
                text={withErrorContext(message('conversation.interactionsFailed'), interactions.error)}
                onRetry={() => void interactions.refetch()}
              />
            ) : null}
            {tab === 'trajectory' ? <TrajectoryPanel items={sourceItems} /> : null}
            {tab === 'chat' ? <ContextRows items={sourceItems} /> : null}
            <View style={tab === 'chat' ? s.listStage : s.hidden}>
              <FlatList
                style={s.listView}
                ref={listRef}
                data={messages}
                keyExtractor={(item, index) => item.rowKey ?? `message-${item.kind}-${item.sourceSeq ?? 'transient'}-${index}`}
                // A long session can hold hundreds of rows; bound the first paint and
                // the batch size so opening one does not mount every row at once.
                initialNumToRender={14}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={40}
                windowSize={11}
                renderItem={({ item }) => (
                  <MessageRow
                    item={item}
                    event={item.sourceSeq === undefined ? undefined : eventBySeq.get(item.sourceSeq)}
                    api={client}
                    sessionId={sessionId}
                  />
                )}
                contentContainerStyle={s.list}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  hasMoreHistory ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={message('conversation.loadOlder')}
                      accessibilityState={{ busy: loadOlder.isPending }}
                      disabled={loadOlder.isPending}
                      onPress={() => void loadOlder.mutateAsync()}
                      style={({ pressed }) => [s.loadOlder, pressed && s.pressed]}
                    >
                      <NativeIcon name="chevron-up-outline" size={16} color={theme.colors.accentText} />
                      <Text style={s.loadOlderText}>{loadOlder.isPending ? message('conversation.loading') : message('conversation.loadOlder')}</Text>
                    </Pressable>
                  ) : null
                }
                ListEmptyComponent={
                  history.isPending ? <SkeletonConversation /> : <Text style={s.empty}>{message('conversation.noMessages')}</Text>
                }
                onContentSizeChange={() => {
                  const initialPositionPending = initialLatestPositionPending.current
                  if (
                    shouldScrollToLatest({
                      hasMessages: messages.length > 0,
                      initialPositionPending,
                      nearLatest: nearLatestMessage.current,
                    })
                  ) {
                    listRef.current?.scrollToEnd({ animated: !initialPositionPending })
                    if (initialPositionPending) initialLatestPositionPending.current = false
                  }
                }}
                onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                  if (!shouldTrackLatestProximity({ initialPositionPending: initialLatestPositionPending.current })) return
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
                  const nearLatest = isNearLatestMessage(contentSize.height, layoutMeasurement.height, contentOffset.y)
                  nearLatestMessage.current = nearLatest
                  setShowReturnToLatest(shouldShowReturnToLatest({ hasMessages: messages.length > 0, nearLatest }))
                }}
                scrollEventThrottle={16}
              />
              {showReturnToLatest ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={message('conversation.backToLatest')}
                  onPress={() => {
                    nearLatestMessage.current = true
                    setShowReturnToLatest(false)
                    listRef.current?.scrollToEnd({ animated: true })
                  }}
                  style={({ pressed }) => [s.returnToLatest, pressed && s.pressed]}
                >
                  <NativeIcon name="chevron-down-outline" size={20} color={theme.colors.ink} />
                </Pressable>
              ) : null}
            </View>
            {tab === 'chat' && status === 'running' ? (
              <View style={s.turnStatusSlot}>
                <NativeTurnStatus startedAt={runningTurnStartedAt} />
              </View>
            ) : null}
            {tab === 'chat' ? (
              <LocalizedSessionStats items={sourceItems} projectionValues={history.data?.projections?.values} />
            ) : null}
            <NativeQueueDock
              items={queue.data?.items ?? []}
              onUpdate={(itemId, action) => updateQueue.mutateAsync({ itemId, action }).then(() => undefined)}
              running={status === 'running'}
            />
            <WorkspaceComposer
              agentPreset={activeSession?.agentPreset}
              model={models.data?.current}
              placeholder={message('conversation.composerPlaceholder')}
              onSend={content => send.mutateAsync(content).then(() => undefined)}
              onCancel={() => cancel.mutate()}
              permissions={readPermissionSelect(history.data?.projections?.values.permissions)}
              sessionId={sessionId}
              cancelling={cancel.isPending}
              disabled={!ready}
              sending={send.isPending}
              running={status === 'running'}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </WorkspaceShell>
  )
}

function MessageRow({
  item,
  event,
  api,
  sessionId,
}: {
  item: NativeConversationRow
  event: Record<string, unknown> | undefined
  api: MobileApi | undefined
  sessionId: string | undefined
}): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const attachments = api !== undefined && sessionId !== undefined ? (
    <NativeMessageAttachments api={api} sessionId={sessionId} event={event} />
  ) : null
  const feedback = api !== undefined && sessionId !== undefined ? (
    <NativeMessageFeedback api={api} sessionId={sessionId} event={event} />
  ) : null
  if (item.kind === 'user')
    return (
      <View style={s.userRow}>
        <View style={s.userBubble}>
          <Text selectable style={s.userText}>
            {item.text}
          </Text>
        </View>
        {attachments}
        <MessageActions alignment="user" text={item.text} time={item.time} />
      </View>
    )
  if (item.kind === 'reasoning') return <NativeReasoningRow row={item} />
  if (item.kind === 'retry') return <NativeRetryRow row={item} />
  if (item.kind === 'turn-error') return <NativeTurnErrorRow row={item} />
  if (item.kind === 'turn-max-tokens') return <NativeTurnMaxTokensRow />
  if (item.kind === 'command') return <NativeCommandRow row={item} />
  if (item.kind === 'compaction') return <NativeCompactionRow row={item} />
  if (item.kind === 'tool')
    return (
      <View style={s.toolRow}>
        <NativeToolCard row={item} />
      </View>
    )
  return (
    <View style={s.assistantRow}>
      <NativeMarkdown
        markdown={item.text}
        onCopyCode={async (code) => {
          await Clipboard.setStringAsync(code)
        }}
      />
      {attachments}
      {feedback}
      <MessageActions alignment="assistant" text={item.text} time={item.time} />
    </View>
  )
}

function MessageActions({ alignment, text, time }: { alignment: MessageActionAlignment; text: string; time?: number }): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  const copy = async (): Promise<void> => {
    if (copied) return
    try {
      await Clipboard.setStringAsync(text)
      setCopied(true)
      setCopyFailed(false)
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        setCopied(false)
      }, 1200)
    } catch {
      setCopyFailed(true)
      void AccessibilityInfo.announceForAccessibility(message('conversation.copyFailed'))
    }
  }

  return (
    <View style={[s.actionRow, alignment === 'user' ? s.actionRowUser : s.actionRowAssistant]}>
      {time === undefined ? null : (
        <Text ellipsizeMode="tail" numberOfLines={1} style={s.actionTime}>
          {formatMessageTime(time)}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copied ? message('conversation.copied') : copyFailed ? message('conversation.copyFailedTitle') : message('conversation.copyMessage')}
        accessibilityState={{ selected: copied }}
        onPress={() => void copy()}
        hitSlop={8}
        style={({ pressed }) => [messageActionLayout(alignment), pressed && s.pressed]}
      >
        <NativeIcon
          name={copied ? 'check-outline' : 'copy-outline'}
          size={16}
          color={
            copied ? theme.colors.success : copyFailed ? theme.colors.danger : theme.colors.inkMuted
          }
        />
      </Pressable>
    </View>
  )
}

function ErrorNotice({ text, onRetry }: { text: string; onRetry: () => void }): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.errorNotice}>
      <Text style={s.error}>{text}</Text>
      <NativeActionButton label={message('common.reload')} icon="refresh-outline" variant="secondary" onPress={onRetry} />
    </View>
  )
}

function UnavailableState({
  message,
  action,
  onPress,
}: {
  message: string
  action: string
  onPress: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.unavailable}>
      <NativeIcon name="link-off" size={28} color={theme.colors.inkFaint} />
      <Text style={s.unavailableText}>{message}</Text>
      <NativeActionButton label={action} icon="chevron-right-outline" onPress={onPress} style={s.unavailableAction} />
    </View>
  )
}

function ConnectionStatus({ status }: { status: string }): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const disconnected = status === 'disconnected'
  const label = disconnected
    ? message('settings.disconnected')
    : status === 'idle'
      ? message('conversation.idle')
      : status === 'running'
        ? message('session.running')
        : status === 'waiting'
          ? message('conversation.waitingForConfirmation')
          : message('conversation.connecting')
  return (
    <View style={s.status}>
      <View style={[s.statusDot, disconnected && s.statusOffline]} />
      <Text style={s.statusText}>{label}</Text>
    </View>
  )
}

function LocalizedSessionStats({
  items,
  projectionValues,
}: {
  items: SharedEventItem[]
  projectionValues: Record<string, unknown> | undefined
}): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  const line = sessionStatisticsLine(projectionValues, items)
  return line === undefined ? null : (
    <View style={s.stats}>
      <Text numberOfLines={2} style={s.statsText}>
        {line}
      </Text>
    </View>
  )
}

function mergeEventItems(...sources: ReadonlyArray<ReadonlyArray<SharedEventItem>>): SharedEventItem[] {
  const items = new Map<string, SharedEventItem>()
  for (const source of sources) {
    for (const item of source) {
      const key = typeof item.seq === 'number' ? `seq:${item.seq}` : `event:${JSON.stringify(item.event)}`
      items.set(key, item)
    }
  }
  return [...items.values()].sort((a, b) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER))
}

function withErrorContext(prefix: string, error: unknown): string {
  const detail = mobileErrorMessage(error, message('common.retry'))
  return `${prefix}：${detail}`
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value.find(item => item.trim()) : value
  const normalized = candidate?.trim()
  return normalized || undefined
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    canvas: { flex: 1 },
    hidden: { display: 'none' },
    action: {
      alignItems: 'center',
      backgroundColor: theme.colors.warningSoft,
      borderBottomColor: '#efd9a5',
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 7,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    actionText: { color: theme.colors.warning, flex: 1, fontSize: 13, fontWeight: '600' },
    // The action strip never wraps: the clock shrinks and truncates instead of
    // pushing the control out of the row.
    actionRow: { alignItems: 'center', flexDirection: 'row', gap: 6, maxWidth: '100%', overflow: 'hidden' },
    actionRowAssistant: { alignSelf: 'flex-start' },
    actionRowUser: { alignSelf: 'flex-end' },
    actionTime: { color: theme.colors.inkFaint, flexShrink: 1, fontSize: 12, minWidth: 0 },
    error: { color: theme.colors.danger, padding: 12 },
    errorNotice: { gap: 6, paddingHorizontal: 12 },
    unavailable: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center', padding: 28 },
    unavailableText: { color: theme.colors.inkMuted, fontSize: 14, textAlign: 'center' },
    unavailableAction: { minWidth: 132 },
    listStage: { flex: 1, position: 'relative' },
    listView: { flex: 1 },
    returnToLatest: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      bottom: theme.spacing.md,
      height: 40,
      justifyContent: 'center',
      position: 'absolute',
      right: theme.spacing.lg,
      width: 40,
      ...theme.elevation.card,
    },
    loadOlder: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      minHeight: theme.touch.minTarget,
      paddingHorizontal: theme.spacing.md,
    },
    loadOlderText: { color: theme.colors.accentText, fontSize: 13, fontWeight: '700' },
    list: {
      gap: theme.spacing.lg,
      // DSH Pocket trims the desktop 32px gutters to 20px so phone lines stay wide.
      paddingHorizontal: 20,
      paddingVertical: theme.spacing.lg,
    },
    empty: { color: theme.colors.inkMuted, paddingVertical: 24, textAlign: 'center' },
    assistantRow: { gap: theme.spacing.lg, maxWidth: '100%', minWidth: 0, width: '100%' },
    userRow: { alignItems: 'flex-end', gap: theme.spacing.xs, maxWidth: '100%' },
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.userBubble,
      borderRadius: theme.radius.bubble,
      maxWidth: '82%',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    userText: { color: theme.colors.ink, fontSize: 15, lineHeight: 22 },
    toolRow: { maxWidth: '100%' },
    turnStatusSlot: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.xs },
    stats: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.xs },
    statsText: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 20, textAlign: 'center' },
    status: { alignItems: 'center', flexDirection: 'row', gap: 5 },
    statusDot: { backgroundColor: theme.colors.success, borderRadius: 4, height: 7, width: 7 },
    statusOffline: { backgroundColor: theme.colors.inkFaint },
    statusText: { color: theme.colors.inkMuted, fontSize: 11 },
    headerMeta: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
    headerMetaLabel: { color: theme.colors.ink, fontSize: 12, fontWeight: '600' },
    headerMetaHint: {
      color: theme.colors.inkMuted,
      flexShrink: 1,
      fontSize: 11,
      marginLeft: 12,
      textAlign: 'right',
    },
    pressed: { opacity: 0.62 },
  })
