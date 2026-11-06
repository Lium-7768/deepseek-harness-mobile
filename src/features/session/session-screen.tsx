import { ConversationDisclosureContext } from '@/components/conversation-disclosure'
import { closingAssistantSequences, conversationFlowGap, conversationRowKey } from '@/components/conversation-flow'
import { MobileApi } from '@/api/mobile-api'
import { NativeAgentActivity } from '@/components/native-agent-activity'
import { NativeGoalEditor } from '@/components/native-goal-editor'
import { NativeGoalBar } from '@/components/native-goal-bar'
import { goalFromProjection, goalWithActivation } from '@/components/session-goal-logic'
import { NativeTurnStatus } from '@/components/native-conversation-status'
import { NativeIcon } from '@/components/native-icon'
import { NativeProcessGroup } from '@/components/native-process-group'
import { NativeQueueDock } from '@/components/native-queue-dock'
import { NativeTodoDock } from '@/components/native-todo-dock'
import { todoFromProjection } from '@/components/todo-logic'
import { NativeTurnGroup } from '@/components/native-turn-group'
import { firstParam, withErrorContext } from '@/components/route-params'
import { readPermissionSelect } from '@/components/session-composer-logic'
import { planFromProjection } from '@/components/plan-logic'
import {
  activeTurnStartedAt,
  projectNativeConversationRows,
  type NativeConversationRow,
} from '@/components/session-conversation-logic'
import { sessionDisplayTitle } from '@/components/session-drawer-logic'
import { MessageRow } from '@/components/session-message-row'
import { groupProcessRows, runningProcessTitle, type NativeProcessRow } from '@/components/session-process-logic'
import { ConnectionStatus, ErrorNotice, SessionDock, UnavailableState } from '@/components/session-screen-state'
import { makeSessionStyles } from '@/components/session-screen-styles'
import {
  READER_SCROLL_TAIL_MS,
  SEND_FOLLOW_WINDOW_MS,
  isNearLatestMessage,
  restoredOffsetAfterPrepend,
  shouldFollowContentGrowth,
  shouldRefreshFromPull,
  shouldLoadOlderHistory,
  unreadCountLabel,
  shouldReleaseFollowOnScroll,
  shouldShowReturnToLatest,
  shouldTrackLatestProximity,
} from '@/components/session-scroll-logic'
import {
  foldCompletedTurns,
  turnSpans,
  type NativeRow,
  type NativeTurnMemberRow,
} from '@/components/session-turn-logic'
import { ContextRows, TrajectoryPanel, WorkbenchTabs, type WorkbenchTab } from '@/components/session-workbench'
import { SkeletonConversation } from '@/components/skeleton'
import { WorkspaceComposer } from '@/components/workspace-composer'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { format, t as message } from '@/locale'
import { type SharedEventItem } from '@/shared/dsh-presentation'
import { useConnectionStore } from '@/state/connection'
import { useMobileSyncStore } from '@/state/mobile-sync'
import { useRouteSessionSelection } from '@/state/session-selection'
import { mergeEventItems } from '@/sync/event-items'
import { sessionWindow } from '@/sync/session-window'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useMutation } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  RefreshControl,
  Platform,
  Pressable,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSessionActions } from './use-session-actions'
import { useSessionSelections } from '@/hooks/use-session-selections'
import { useSessionQueries } from './use-session-queries'

export default function SessionScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeSessionStyles)
  const { sessionId: rawSessionId, draft } = useLocalSearchParams<{
    sessionId?: string | string[]
    draft?: string | string[]
  }>()
  const sessionId = firstParam(rawSessionId)
  const connection = useConnectionStore((state) => state.connection)
  const insets = useSafeAreaInsets()
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const listRef = useRef<FlatList<NativeRow>>(null)
  const submittedDraft = useRef<string | undefined>(undefined)
  const initialLatestPositionPending = useRef(true)
  // Sticky-latest latch: only a reader's own drag or momentum may release it, so
  // content that grows while the list grows too keeps the newest message in view.
  const nearLatestMessage = useRef(true)
  const readerScrolling = useRef(false)
  const readerScrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Set by the reader's own send, then cleared after SEND_FOLLOW_WINDOW_MS. The
  // prompt row and the first reply chunk land in separate commits, so a stale
  // offset measured in between would otherwise release the follow latch.
  const sendFollowUntil = useRef(0)
  /** Last measured content height and offset, used to anchor a history prepend. */
  const listMetrics = useRef({ contentHeight: 0, offsetY: 0 })
  /** Set by `loadOlder` so the next content growth restores the reader's offset. */
  const pendingPrependAnchor = useRef<{ contentHeight: number; offsetY: number } | null>(null)
  /** A page that brought no rows means scrolling further cannot find more, even if the host says it has. */
  const exhaustedOlderHistory = useRef(false)
  const [showReturnToLatest, setShowReturnToLatest] = useState(false)
  // Message rows present when the reader left the bottom; the badge counts what came after.
  const unseenBaseline = useRef<number | undefined>(undefined)
  const [unseenCount, setUnseenCount] = useState(0)
  const [olderItems, setOlderItems] = useState<SharedEventItem[]>([])
  const [olderHasMore, setOlderHasMore] = useState<boolean | undefined>()
  const [tab, setTab] = useState<WorkbenchTab>('chat')
  const [goalEditorOpen, setGoalEditorOpen] = useState(false)
  const [goalEditRequest, setGoalEditRequest] = useState(0)
  useEffect(() => {
    setGoalEditorOpen(false)
    setGoalEditRequest(0)
  }, [sessionId])
  /** Set once `pinToLatest` exists so the send callback can reach it. */
  const pinToLatestRef = useRef<() => void>(() => undefined)
  const ready = Boolean(client && sessionId)
  const {
    history,
    goal: liveGoal,
    events,
    queue,
    jobs,
    subagents,
    interactions,
    activeSession,
    models,
    presets,
    commands,
  } = useSessionQueries(client, connection, sessionId)
  const sessionTitle = sessionDisplayTitle(activeSession)
  const { branch, send, updateQueue, cancel, goalMutation, createGoalMutation, interruptSubagent } = useSessionActions(
    client,
    sessionId,
    () => {
      // The prompt row and the first reply chunk arrive in separate commits, so the
      // follow window outlives this callback; content growth inside it re-pins even if
      // an intermediate measurement reads as away-from-bottom.
      sendFollowUntil.current = Date.now() + SEND_FOLLOW_WINDOW_MS
      pinToLatestRef.current()
    },
  )
  const branchFromMessage = branch.mutate
  const loadOlder = useMutation({
    mutationFn: async () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      const source = sourceItems
      const beforeSeq = Math.min(...source.flatMap((item) => (typeof item.seq === 'number' ? [item.seq] : [])))
      if (!Number.isFinite(beforeSeq)) throw new Error(message('conversation.noMoreHistory'))
      return client.sessionHistory(sessionId, { beforeSeq, maxMessages: 200 })
    },
    onSuccess: (page) => {
      // Prepend anchors the reader: newer rows above the viewport add height without
      // moving what is being read, so the offset has to grow by the same amount. The
      // list's own `maintainVisibleContentPosition` is gone because its latch also
      // fights the jump to the newest message.
      const before = listMetrics.current
      if (page.items.length === 0) exhaustedOlderHistory.current = true
      setOlderItems((current) => mergeEventItems(page.items, current))
      setOlderHasMore(page.hasMore ?? false)
      pendingPrependAnchor.current = before
    },
    onError: (error) =>
      Alert.alert(
        message('conversation.loadOlderFailedTitle'),
        withErrorContext(message('conversation.historyNotLoaded'), error),
      ),
  })
  const sendMessage = useRef(send.mutate)
  sendMessage.current = send.mutate

  /**
   * Re-reads the conversation after a pull, keeping the reader's offset.
   *
   * A dropped event leaves the transcript stale with no way to ask again; a pull is that
   * ask. The list is never cleared, so nothing flashes while the answer arrives.
   */
  const [refreshing, setRefreshing] = useState(false)
  const refreshFromPull = useCallback(async (): Promise<void> => {
    if (!shouldRefreshFromPull({ refreshing, loadingOlder: loadOlder.isPending })) return
    const before = listMetrics.current
    pendingPrependAnchor.current = null
    setRefreshing(true)
    try {
      await Promise.all([
        history.refetch(),
        events.refetch(),
        queue.refetch(),
        jobs.refetch(),
        subagents.refetch(),
        interactions.refetch(),
      ])
      // The transcript grew above the reader only if the refetch added older rows; the
      // anchor keeps the reading position rather than jumping to either end.
      pendingPrependAnchor.current = before
    } catch {
      // The query hooks already surface their own failure state; the pull only ends.
    } finally {
      setRefreshing(false)
    }
  }, [events, history, interactions, jobs, loadOlder.isPending, queue, refreshing, subagents])

  useRouteSessionSelection(sessionId)

  useEffect(() => {
    submittedDraft.current = undefined
    initialLatestPositionPending.current = true
    nearLatestMessage.current = true
    setShowReturnToLatest(false)
    setOlderItems([])
    setOlderHasMore(undefined)
    exhaustedOlderHistory.current = false
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

  const recentWindow = useMemo(
    () => sessionWindow(mergeEventItems(history.data?.items ?? [], events.data?.items ?? [])),
    [history.data?.items, events.data?.items],
  )
  const sourceItems = useMemo(() => mergeEventItems(olderItems, recentWindow.items), [olderItems, recentWindow])
  const messages = useMemo(() => projectNativeConversationRows(sourceItems), [sourceItems])
  const runningTurnStartedAt = useMemo(() => activeTurnStartedAt(sourceItems), [sourceItems])
  const spans = useMemo(() => turnSpans(sourceItems), [sourceItems])
  // The running Turn is flat like the desktop's latest Turn: one header names
  // what the agent is doing now, and later steps continue under it.
  const liveTurnStartSeq = useMemo(() => {
    if (runningTurnStartedAt === undefined) return undefined
    const open = spans.find((span) => span.endSeq === Number.MAX_SAFE_INTEGER)
    return open?.startSeq
  }, [runningTurnStartedAt, spans])
  const liveTitle = useMemo(
    () => (runningTurnStartedAt === undefined ? undefined : runningProcessTitle(messages)),
    [messages, runningTurnStartedAt],
  )
  const stepRows = useMemo(
    () =>
      groupProcessRows(messages, {
        running: runningTurnStartedAt !== undefined,
        ...(liveTurnStartSeq === undefined ? {} : { liveTurnStartSeq }),
        ...(liveTitle === undefined ? {} : { liveTitle }),
      }),
    [liveTitle, liveTurnStartSeq, messages, runningTurnStartedAt],
  )
  // A settled Turn folds behind one control; an open Turn has no end sequence, so
  // its steps keep their live headers.
  const displayRows = useMemo(() => foldCompletedTurns(stepRows, { spans }), [spans, stepRows])
  const eventBySeq = useMemo(
    () =>
      new Map(sourceItems.flatMap((item) => (typeof item.seq === 'number' ? [[item.seq, item.event] as const] : []))),
    [sourceItems],
  )

  // Unstable list props re-render every mounted cell. The reader's own scroll
  // updates `showReturnToLatest`, so an inline renderItem re-rendered the whole
  // conversation on every scroll frame; these callbacks and the event lookup keep
  // their identity across those renders.
  const eventBySeqRef = useRef(eventBySeq)
  eventBySeqRef.current = eventBySeq
  const getEvent = useCallback(
    (seq: number | undefined) => (seq === undefined ? undefined : eventBySeqRef.current.get(seq)),
    [],
  )
  useEffect(() => {
    const baseline = unseenBaseline.current
    if (baseline === undefined) return
    const arrived = messages.length - baseline
    setUnseenCount(arrived > 0 ? arrived : 0)
  }, [messages.length])
  const closingBlocks = useMemo(() => closingAssistantSequences(displayRows), [displayRows])
  const isClosingBlock = useCallback(
    (row: NativeConversationRow) => row.sourceSeq !== undefined && closingBlocks.has(row.sourceSeq),
    [closingBlocks],
  )
  const renderRow = useCallback(
    (row: NativeConversationRow) => (
      <MessageRow
        api={client}
        compact={row.kind === 'assistant' && !isClosingBlock(row)}
        event={getEvent(row.sourceSeq)}
        item={row}
        onBranch={branchFromMessage}
        sessionId={sessionId}
        // Deliberate departure from the desktop: `MessageIconActions` renders only in
        // `TurnTailNodeView` because a pointer can drag-select any earlier block. A phone
        // cannot, and the selection handles inside a scrolling list are hard to grab, so
        // every assistant block carries a copy control; only the closing block repeats the
        // clock, rating and branch action.
        showActions
      />
    ),
    [branchFromMessage, client, getEvent, isClosingBlock, sessionId],
  )
  // A step's rows sit behind one collapsed header, the way the desktop groups a
  // step instead of printing a row per call.
  // Open steps live here, not in the row: the list recycles rows, so a disclosure
  // held by the row would collapse whenever it scrolled out of view and back.
  const [openSteps, setOpenSteps] = useState<ReadonlySet<string>>(() => new Set())
  const toggleStep = useCallback((rowKey: string) => {
    initialLatestPositionPending.current = false
    setOpenSteps((current) => {
      const next = new Set(current)
      if (next.has(rowKey)) next.delete(rowKey)
      else next.add(rowKey)
      return next
    })
  }, [])
  const renderGroupRow = useCallback((row: NativeConversationRow) => renderRow(row), [renderRow])
  const renderStep = useCallback(
    (row: NativeProcessRow) => (
      <NativeProcessGroup
        expanded={row.running ? !openSteps.has(`closed:${row.rowKey}`) : openSteps.has(row.rowKey)}
        item={row}
        onToggle={(key) => toggleStep(row.running ? `closed:${key}` : key)}
        renderRow={renderGroupRow}
      />
    ),
    [openSteps, renderGroupRow, toggleStep],
  )
  // A Turn's control reveals step groups, retries, and command rows together, so
  // the member renderer dispatches on the row rather than assuming a step.
  const renderTurnMember = useCallback(
    (row: NativeTurnMemberRow) =>
      row.kind === 'process' ? (
        <View style={s.processMembers}>
          {row.rows.map((member, index) => (
            <View key={conversationRowKey(member, index)}>{renderRow(member)}</View>
          ))}
        </View>
      ) : (
        renderRow(row)
      ),
    [renderRow, s.processMembers],
  )
  const renderItem = useCallback(
    ({ item, index }: { item: NativeRow; index: number }) => {
      const content =
        item.kind === 'turn' ? (
          <NativeTurnGroup
            expanded={openSteps.has(item.rowKey)}
            item={item}
            onToggle={toggleStep}
            renderRow={renderTurnMember}
          />
        ) : item.kind === 'process' ? (
          renderStep(item)
        ) : (
          renderRow(item)
        )
      return <View style={{ paddingTop: conversationFlowGap(item, displayRows[index - 1]) }}>{content}</View>
    },
    [displayRows, openSteps, renderRow, renderStep, renderTurnMember, toggleStep],
  )
  const keyExtractor = useCallback((item: NativeRow, index: number) => conversationRowKey(item, index), [])
  const disclosures = useMemo(() => ({ expanded: openSteps, toggle: toggleStep }), [openSteps, toggleStep])
  useEffect(() => {
    setOpenSteps(new Set())
  }, [sessionId])
  useEffect(() => {
    if (tab !== 'chat' || messages.length === 0 || !initialLatestPositionPending.current) return
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0)
    return () => clearTimeout(timer)
  }, [messages.length, tab])

  /**
   * Records how far the reader is from the newest message and mirrors it into the
   * return-to-latest control.
   * @param event - Native scroll measurement that produced the current offset.
   * @param releaseLatch - Whether this measurement may move the sticky-latest latch.
   */
  const applyScrollProximity = (event: NativeScrollEvent, releaseLatch: boolean): void => {
    if (!shouldTrackLatestProximity({ initialPositionPending: initialLatestPositionPending.current })) return
    // A measurement taken while the reader's own send is still landing trails the new
    // content, so releasing the latch there would strand the reply above the viewport.
    const mayRelease = shouldReleaseFollowOnScroll({
      readerScrolling: releaseLatch,
      sendFollowWindowOpen: Date.now() < sendFollowUntil.current,
    })
    if (mayRelease) {
      nearLatestMessage.current = isNearLatestMessage(
        event.contentSize.height,
        event.layoutMeasurement.height,
        event.contentOffset.y,
      )
    }
    // The control mirrors the latch, not this measurement: a programmatic scroll that
    // outruns content growth must not advertise a return-to-latest that lands nowhere.
    setShowReturnToLatest(
      shouldShowReturnToLatest({ hasMessages: messages.length > 0, nearLatest: nearLatestMessage.current }),
    )
    if (nearLatestMessage.current) {
      unseenBaseline.current = undefined
      setUnseenCount(0)
    } else if (unseenBaseline.current === undefined) {
      // The baseline is the row count at the moment the reader left the bottom, so the
      // badge reports what arrived since, not the size of the whole transcript.
      unseenBaseline.current = messages.length
    }
  }

  /** Opens a window in which measurements count as the reader steering the list. */
  const beginReaderScroll = (): void => {
    if (readerScrollIdleTimer.current) clearTimeout(readerScrollIdleTimer.current)
    readerScrollIdleTimer.current = null
    readerScrolling.current = true
  }

  /** Closes the reader window after the momentum tail of the current gesture. */
  const settleReaderScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    applyScrollProximity(event.nativeEvent, true)
    if (readerScrollIdleTimer.current) clearTimeout(readerScrollIdleTimer.current)
    readerScrollIdleTimer.current = setTimeout(() => {
      readerScrolling.current = false
      readerScrollIdleTimer.current = null
    }, READER_SCROLL_TAIL_MS)
  }

  /**
   * Pins the list to the newest message and keeps the follow latch closed.
   *
   * A single jump is enough on its own: `onContentSizeChange` re-pins while the reader
   * stays at the bottom, which is what carries the list past the lazily mounted rows a
   * long conversation adds after this call. Re-pinning from a timer instead made every
   * late row measurement a visible jump.
   */
  function pinToLatest(): void {
    nearLatestMessage.current = true
    setShowReturnToLatest(false)
    unseenBaseline.current = undefined
    setUnseenCount(0)
    listRef.current?.scrollToEnd({ animated: false })
  }
  pinToLatestRef.current = pinToLatest

  useEffect(
    () => () => {
      if (readerScrollIdleTimer.current) clearTimeout(readerScrollIdleTimer.current)
    },
    [],
  )

  const hasMoreHistory =
    olderHasMore ??
    (recentWindow.truncated || events.data?.windowStartSeq !== undefined || history.data?.hasMore === true)
  const actions = interactions.data?.items.length ?? 0
  const goal = goalWithActivation(
    goalFromProjection(history.data?.projections?.values),
    liveGoal.isError ? undefined : liveGoal.data?.goal,
  )
  // The desktop registers this dock at order 0, ahead of the goal bar and the queue.
  const todos = todoFromProjection(history.data?.projections?.values)
  const plan = planFromProjection(history.data?.projections?.values)
  const reportedStatus = events.data?.status ?? message('conversation.connecting')
  const running = reportedStatus === 'running' || activeSession?.running === true || runningTurnStartedAt !== undefined
  const status = running ? 'running' : reportedStatus
  const selections = useSessionSelections({
    client,
    sessionId,
    permissions: readPermissionSelect(history.data?.projections?.values.permissions),
    model: models.data?.current,
    agentPreset: activeSession?.agentPreset,
    eventsError: events.isError || history.isError,
    eventsPending: events.isPending || history.isPending,
    eventsStale: events.isStale,
    status,
    unavailable: !ready || send.isPending || cancel.isPending,
  })
  const syncStatus = useMobileSyncStore((state) => state.status)
  const displayStatus =
    !connection || syncStatus === 'disconnected' ? 'disconnected' : syncStatus === 'connecting' ? 'connecting' : status

  return (
    <ConversationDisclosureContext.Provider value={disclosures}>
      <WorkspaceShell
        title={sessionTitle}
        rightAction={<ConnectionStatus onPress={() => void refreshFromPull()} status={displayStatus} />}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={workspaceKeyboardVerticalOffset(insets.top, false)}
          style={s.canvas}
        >
          {!connection ? (
            <UnavailableState
              message={message('drawer.connectFirstBody')}
              action={message('conversation.goConnect')}
              onPress={() => router.replace('/connect')}
            />
          ) : !sessionId ? (
            <UnavailableState
              message={message('conversation.missingSessionId')}
              action={message('conversation.backToWorkspace')}
              onPress={() => router.replace('/workspace')}
            />
          ) : (
            <>
              <WorkbenchTabs tab={tab} onChange={setTab} />
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
                  data={displayRows}
                  keyExtractor={keyExtractor}
                  // A long session can hold hundreds of rows; bound the first paint and
                  // the batch size so opening one does not mount every row at once.
                  initialNumToRender={14}
                  maxToRenderPerBatch={10}
                  updateCellsBatchingPeriod={40}
                  windowSize={11}
                  // No `maintainVisibleContentPosition`: its latch anchors the first visible
                  // row across every content change, including the jump to the newest message,
                  // and the two pull in opposite directions. History prepends restore their own
                  // offset instead (see `loadOlder`).
                  renderItem={renderItem}
                  contentContainerStyle={s.list}
                  keyboardDismissMode="on-drag"
                  keyboardShouldPersistTaps="handled"
                  // A pull re-reads the conversation from the Host; the older-history
                  // loader owns its own trigger and never fires from this gesture.
                  refreshControl={
                    <RefreshControl
                      colors={[theme.colors.accent]}
                      onRefresh={() => void refreshFromPull()}
                      refreshing={refreshing}
                      tintColor={theme.colors.accent}
                    />
                  }
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <>
                      <NativeAgentActivity
                        jobs={jobs.data?.items ?? []}
                        subagents={subagents.data?.entries ?? []}
                        interruptingId={interruptSubagent.isPending ? interruptSubagent.variables : undefined}
                        onOpenSubagent={(entry) =>
                          router.push({
                            pathname: '/session/[sessionId]/subagent',
                            params: { sessionId: entry.id, parentSessionId: sessionId, mode: entry.mode },
                          })
                        }
                        onInterruptSubagent={(entry) => interruptSubagent.mutate(entry.id)}
                      />
                      {hasMoreHistory ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={message('conversation.loadOlder')}
                          accessibilityState={{ busy: loadOlder.isPending }}
                          disabled={loadOlder.isPending}
                          onPress={() => void loadOlder.mutateAsync()}
                          style={({ pressed }) => [s.loadOlder, pressed && s.pressed]}
                        >
                          <NativeIcon name="chevron-up-outline" size={16} color={theme.colors.accentText} />
                          <Text style={s.loadOlderText}>
                            {loadOlder.isPending ? message('conversation.loading') : message('conversation.loadOlder')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </>
                  }
                  ListFooterComponent={
                    status === 'running' ? (
                      <View style={s.turnStatusSlot}>
                        <NativeTurnStatus startedAt={runningTurnStartedAt} />
                      </View>
                    ) : null
                  }
                  ListEmptyComponent={
                    history.isPending ? (
                      <SkeletonConversation />
                    ) : (
                      <Text style={s.empty}>{message('conversation.noMessages')}</Text>
                    )
                  }
                  onContentSizeChange={(_width: number, height: number) => {
                    // A long conversation keeps mounting rows after the first jump, and a
                    // streaming reply grows on every chunk, so the follow is decided per
                    // content change rather than once per open. The reader's own drag is
                    // what releases it; a programmatic jump cannot.
                    const anchor = pendingPrependAnchor.current
                    if (anchor !== null) {
                      pendingPrependAnchor.current = null
                      initialLatestPositionPending.current = false
                      listRef.current?.scrollToOffset({
                        animated: false,
                        offset: restoredOffsetAfterPrepend({
                          previousContentHeight: anchor.contentHeight,
                          previousOffset: anchor.offsetY,
                          nextContentHeight: height,
                        }),
                      })
                      return
                    }
                    const sendFollowWindowOpen = Date.now() < sendFollowUntil.current
                    const follow = shouldFollowContentGrowth({
                      hasMessages: messages.length > 0,
                      sticksToLatest: initialLatestPositionPending.current || nearLatestMessage.current,
                      sendFollowWindowOpen,
                    })
                    if (!follow) return
                    initialLatestPositionPending.current = false
                    pinToLatest()
                  }}
                  onMomentumScrollBegin={() => {
                    // Extend the reader window for a gesture's momentum tail; momentum that
                    // follows a programmatic scroll must not release the sticky latch.
                    if (readerScrolling.current) beginReaderScroll()
                  }}
                  onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                    if (readerScrolling.current) settleReaderScroll(event)
                  }}
                  onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                    // Every measurement feeds the prepend anchor, including the ones taken
                    // before initial positioning finishes; only the follow latch is gated.
                    listMetrics.current = {
                      contentHeight: event.nativeEvent.contentSize.height,
                      offsetY: event.nativeEvent.contentOffset.y,
                    }
                    // Reaching for older history should not need a second press on a button
                    // that sits above the very rows being requested.
                    if (
                      shouldLoadOlderHistory({
                        offsetY: event.nativeEvent.contentOffset.y,
                        hasMore: olderHasMore !== false,
                        loading: loadOlder.isPending,
                        exhausted: exhaustedOlderHistory.current,
                      })
                    )
                      void loadOlder.mutateAsync().catch(() => undefined)
                    if (!shouldTrackLatestProximity({ initialPositionPending: initialLatestPositionPending.current }))
                      return
                    applyScrollProximity(event.nativeEvent, readerScrolling.current)
                  }}
                  onScrollBeginDrag={beginReaderScroll}
                  onScrollEndDrag={settleReaderScroll}
                  scrollEventThrottle={16}
                />
                {showReturnToLatest ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      unreadCountLabel(unseenCount) === undefined
                        ? message('conversation.backToLatest')
                        : `${message('conversation.backToLatest')}，${format('conversation.newMessages', { count: unreadCountLabel(unseenCount) as string })}`
                    }
                    onPress={pinToLatest}
                    style={({ pressed }) => [s.returnToLatest, pressed && s.returnToLatestPressed]}
                  >
                    <NativeIcon name="chevron-down-outline" size={20} color={theme.colors.ink} />
                    {unreadCountLabel(unseenCount) === undefined ? null : (
                      <View style={s.returnToLatestBadge}>
                        <Text maxFontSizeMultiplier={1.2} style={s.returnToLatestBadgeText}>
                          {unreadCountLabel(unseenCount)}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ) : null}
              </View>
              <NativeGoalEditor
                open={goalEditorOpen}
                pending={createGoalMutation.isPending}
                onClose={() => setGoalEditorOpen(false)}
                onCreate={(objective) => createGoalMutation.mutateAsync(objective).then(() => undefined)}
              />
              <WorkspaceComposer
                key={sessionId ?? 'workspace'}
                agentPreset={activeSession?.agentPreset}
                model={models.data?.current}
                onOpenGoal={() => {
                  if (goal && goal.phase !== 'complete') setGoalEditRequest((value) => value + 1)
                  else setGoalEditorOpen(true)
                }}
                header={
                  (goal && goal.phase !== 'complete') ||
                  todos !== undefined ||
                  queue.data?.items.some((item) => item.placement === 'queued') ? (
                    <View style={s.composerContext}>
                      <NativeTodoDock todos={todos} />
                      <NativeGoalBar
                        goal={goal}
                        editRequest={goalEditRequest}
                        pending={goalMutation.isPending}
                        onMutate={(action, ref, objective) =>
                          goalMutation.mutateAsync({ action, ref, objective }).then(() => undefined)
                        }
                      />
                      <NativeQueueDock
                        items={queue.data?.items ?? []}
                        onUpdate={(itemId, action) => updateQueue.mutateAsync({ itemId, action }).then(() => undefined)}
                        running={status === 'running'}
                      />
                    </View>
                  ) : undefined
                }
                placeholder={message('conversation.composerPlaceholder')}
                onSend={(content) => send.mutateAsync(content).then(() => undefined)}
                onCancel={() => cancel.mutate()}
                commands={commands.data}
                permissions={readPermissionSelect(history.data?.projections?.values.permissions)}
                plan={plan}
                sessionId={sessionId}
                cancelling={cancel.isPending}
                disabled={!ready}
                sending={send.isPending}
                running={status === 'running'}
                modelCatalog={models.data}
                modelCatalogError={models.isError}
                modelCatalogLoading={models.isPending}
                onRetryModels={() => models.refetch()}
                selectionPending={selections.pending}
                onSelectMode={selections.selectPreset}
                onSelectModel={selections.selectModel}
                onSelectPermission={selections.selectPermission}
                permissionLocked={selections.permissionLocked}
                presets={presets.data?.presets}
                footer={
                  tab === 'chat' ? (
                    <SessionDock items={sourceItems} projectionValues={history.data?.projections?.values} />
                  ) : undefined
                }
              />
            </>
          )}
        </KeyboardAvoidingView>
      </WorkspaceShell>
    </ConversationDisclosureContext.Provider>
  )
}
