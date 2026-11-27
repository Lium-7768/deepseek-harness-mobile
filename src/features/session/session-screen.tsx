import { ConversationDisclosureContext, useConversationDisclosuresState } from '@/components/conversation-disclosure'
import { useConversationViewport } from './use-conversation-viewport'
import { conversationRowKey } from '@/components/conversation-flow'
import { MobileApi } from '@/api/mobile-api'
import { ConversationLeadingBlocks } from './conversation-leading-blocks'
import type { MobileSubagentEntry } from '@/types/mobile'
import { NativeGoalEditor } from '@/components/native-goal-editor'
import { NativeGoalBar } from '@/components/native-goal-bar'
import { goalFromProjection, goalWithActivation } from '@/components/session-goal-logic'
import { NativeTurnStatus } from '@/components/native-conversation-status'
import { NativeIcon } from '@/components/native-icon'
import { NativeProcessGroup } from '@/components/native-process-group'
import { NativeQueueDock } from '@/components/native-queue-dock'
import { NativeSessionCatalogSheet } from '@/components/native-session-catalog-sheet'
import { NativeQuestionPromptRow } from '@/components/native-question-prompt-row'
import { SessionHeaderActions, type HeaderMenuRow } from '@/components/session-header-actions'
import { agentPresetLabel } from '@/components/session-composer-logic'
import { shareSessionLog } from '@/export/session-log-share'
import { NativeTodoDock } from '@/components/native-todo-dock'
import { todoFromProjection } from '@/components/todo-logic'
import { NativeTurnGroup } from '@/components/native-turn-group'
import { firstParam, withErrorContext } from '@/components/route-params'
import { readPermissionSelect, streamDropped } from '@/components/session-composer-logic'
import { namespaceValue, readRecord, readString } from '@/components/settings/settings-shared'
import { planFromProjection } from '@/components/plan-logic'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { sessionDisplayTitle } from '@/components/session-drawer-logic'
import { MessageRow } from '@/components/session-message-row'
import type { NativeProcessRow } from '@/components/session-process-logic'
import { ConnectionStatus, ErrorNotice, SessionDock, UnavailableState } from '@/components/session-screen-state'
import { makeSessionStyles } from '@/components/session-screen-styles'
import { olderPageAdvance, shouldRefreshFromPull, unreadCountLabel } from '@/components/session-scroll-logic'
import type { NativeTurnMemberRow } from '@/components/session-turn-logic'
import { teamTasks } from '@/components/team-task-logic'
import { SkeletonConversation } from '@/components/skeleton'
import { ComposerDockChips, type ComposerDock } from '@/components/composer-dock-chips'
import { NativeDeliverablesRow } from '@/components/native-deliverables-row'
import { NativeTurnTriggerRow } from '@/components/native-turn-trigger-row'
import { WorkspaceComposer } from '@/components/workspace-composer'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { format, t as message } from '@/locale'
import { formatQuoteText } from '@/components/markdown-quote'
import { noteSessionRead } from '@/state/completion-notices'
import { useComposerDraftStore } from '@/state/composer-drafts'
import { showSnackbar } from '@/state/snackbar'
import { tapFeedback } from '@/components/haptics'
import { type SharedEventItem } from '@/shared/dsh-presentation'
import { doneFeedback } from '@/components/haptics'
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
import {
  CONVERSATION_GAP_STYLES,
  useConversationTranscript,
  type TranscriptListEntry,
} from '@/hooks/use-conversation-transcript'
import { useSessionSelections } from '@/hooks/use-session-selections'
import { shouldMarkSessionRead, type SessionReadSnapshot } from './session-read-logic'
import { useSessionQueries } from './use-session-queries'

/** Events one older page may add; enough for a screen or two of history per press. */
const OLDER_PAGE_EVENTS = 400

/** Finds the smallest numeric event sequence without spreading large arrays onto the call stack. */
function minEventSeq(items: readonly SharedEventItem[]): number | undefined {
  let minimum: number | undefined
  for (const item of items) {
    if (typeof item.seq === 'number' && (minimum === undefined || item.seq < minimum)) minimum = item.seq
  }
  return minimum
}

export default function SessionScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeSessionStyles)
  const { sessionId: rawSessionId, draft } = useLocalSearchParams<{
    sessionId?: string | string[]
    draft?: string | string[]
  }>()
  const sessionId = firstParam(rawSessionId)
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId
  const connection = useConnectionStore((state) => state.connection)
  const insets = useSafeAreaInsets()
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const submittedDraft = useRef<string | undefined>(undefined)
  /** A page that brought no rows means scrolling further cannot find more, even if the host says it has. */
  const exhaustedOlderHistory = useRef(false)

  const streamStatus = useMobileSyncStore((state) => state.status)
  /** A paired client whose stream dropped: drafting stays open, sending does not. */
  const offline = streamDropped({ hasConnection: connection !== undefined, status: streamStatus })
  const [olderItems, setOlderItems] = useState<SharedEventItem[]>([])
  const [olderHasMore, setOlderHasMore] = useState<boolean | undefined>()

  const [goalEditorOpen, setGoalEditorOpen] = useState(false)
  const [goalEditRequest, setGoalEditRequest] = useState(0)
  // One dock at rest: the three cards the desktop stacks above the composer
  // become a chip row, and a chip opens its own dock underneath.
  const [openDock, setOpenDock] = useState<ComposerDock | undefined>(undefined)

  useEffect(() => {
    setGoalEditorOpen(false)
    setGoalEditRequest(0)
    setOpenDock(undefined)
  }, [sessionId])
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
    skills,
    settings,
  } = useSessionQueries(client, connection, sessionId)
  // The composer delivers a draft into a running Turn the same way the desktop does;
  // which of the two modes is the reader's stored preference.
  const busyEnter: 'queue' | 'steer' =
    readString(readRecord(namespaceValue(settings.data, 'ui-conversation'))?.busyEnter) === 'steer' ? 'steer' : 'queue'
  const sessionTitle = sessionDisplayTitle(activeSession)
  const busyEnterRef = useRef(busyEnter)
  busyEnterRef.current = busyEnter
  const { branch, send, updateQueue, cancel, goalMutation, createGoalMutation, interruptSubagent } = useSessionActions(
    client,
    sessionId,
    () => {
      // The prompt row and the first reply chunk arrive in separate commits, so the
      // follow window outlives this callback; content growth inside it re-pins even if
      // an intermediate measurement reads as away-from-bottom.
      noteSend()
    },
    () => busyEnterRef.current,
  )
  const branchFromMessage = branch.mutate
  const loadOlder = useMutation({
    // A deliberate press reports its failure; an automatic request near the top does not,
    // because a modal for a page the reader never asked for interrupts reading.
    mutationFn: async ({ sessionId: targetSessionId }: { manual: boolean; sessionId: string | undefined }) => {
      if (!client || !targetSessionId) throw new Error(message('conversation.openFromList'))
      const beforeSeq = minEventSeq(sourceItems)
      if (beforeSeq === undefined) throw new Error(message('conversation.noMoreHistory'))
      const page = await client.sessionHistory(targetSessionId, { beforeSeq, maxMessages: 200 })
      return { page, targetSessionId }
    },
    onSuccess: ({ page, targetSessionId }) => {
      if (sessionIdRef.current !== targetSessionId) return
      // Prepend anchors the reader: newer rows above the viewport add height without
      // moving what is being read, so the offset has to grow by the same amount. The
      // list's own `maintainVisibleContentPosition` is gone because its latch also
      // fights the jump to the newest message.
      //
      // The Host sizes a page by messages but ships every event behind them, so the page
      // repeats what is already loaded. Taking only the events older than the current
      // oldest moves the cursor, which is what the next press needs.
      const oldestLoaded = minEventSeq(sourceItems)
      const advance = olderPageAdvance({
        items: page.items,
        oldestLoadedSeq: oldestLoaded,
        pageSize: OLDER_PAGE_EVENTS,
      })
      if (advance.exhausted) exhaustedOlderHistory.current = true
      setOlderItems((current) => mergeEventItems(advance.items, current))
      // Only report more when this page actually advanced; otherwise the control would
      // invite a press that repeats the same request forever.
      setOlderHasMore(advance.exhausted ? false : (page.hasMore ?? advance.items.length > 0))
      noteOlderPageLoaded()
    },
    onError: (error, variables) => {
      if (sessionIdRef.current !== variables.sessionId) return
      // A failed page is also the end of the line for the automatic trigger: retrying it
      // would reach the Host again on every scroll and surface the same alert.
      exhaustedOlderHistory.current = true
      if (!variables.manual) return
      Alert.alert(
        message('conversation.loadOlderFailedTitle'),
        withErrorContext(message('conversation.historyNotLoaded'), error),
      )
    },
  })
  const loadOlderMutateAsync = loadOlder.mutateAsync
  const resetLoadOlder = loadOlder.reset
  const sendMessage = useRef(send.mutate)
  sendMessage.current = send.mutate

  useRouteSessionSelection(sessionId)

  useEffect(() => {
    const value = firstParam(draft)
    if (!client || !sessionId || !value) return
    const key = `${sessionId}:${value}`
    if (submittedDraft.current === key) return
    submittedDraft.current = key
    sendMessage.current([{ type: 'text', text: value }])
  }, [client, draft, sessionId])

  const recentWindow = useMemo(
    () => sessionWindow(mergeEventItems(history.data?.items ?? [], events.data?.items ?? [])),
    [history.data?.items, events.data?.items],
  )
  const sourceItems = useMemo(() => mergeEventItems(olderItems, recentWindow.items), [olderItems, recentWindow])
  const { policy, messages, displayRows, invertedEntries, runningTurnStartedAt, showRunningDivider } =
    useConversationTranscript(sourceItems, settings.data)
  const messageCount = messages.length
  const viewport = useConversationViewport<TranscriptListEntry>({ sessionId, messageCount })
  const {
    listRef,
    showReturnToLatest,
    unseenCount,
    pinToLatest,
    beginReaderScroll,
    beginMomentumScroll,
    settleReaderScroll,
    settleMomentumScroll,
    handleScroll,
    isAwayFromLatest,
    isAtHistoryRunway,
    noteOlderPageLoaded,
    noteSend,
    resetForSession,
    handleContentSizeChange,
  } = viewport

  /**
   * Re-reads the conversation after a pull, keeping the reader's offset.
   *
   * A dropped event leaves the transcript stale with no way to ask again; a pull is that
   * ask. The list is never cleared, so nothing flashes while the answer arrives.
   */
  const [refreshing, setRefreshing] = useState(false)
  const refreshFromPull = useCallback(async (): Promise<void> => {
    if (!shouldRefreshFromPull({ refreshing, loadingOlder: loadOlder.isPending })) return
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
      // Anchor only a reader who is reading history: someone already at the bottom wants
      // the newest rows, and restoring their old offset would park them above the end.
      if (!isAwayFromLatest()) pinToLatest()
    } catch {
      // The query hooks already surface their own failure state; the pull only ends.
    } finally {
      setRefreshing(false)
    }
  }, [
    events,
    history,
    interactions,
    isAwayFromLatest,
    jobs,
    loadOlder.isPending,
    pinToLatest,
    queue,
    refreshing,
    subagents,
  ])

  const refetchAll = useCallback((): void => {
    void refreshFromPull()
  }, [refreshFromPull])
  const returnToLatest = useCallback((): void => pinToLatest({ scroll: true }), [pinToLatest])
  const openSubagent = useCallback(
    (entry: MobileSubagentEntry): void => {
      // A diagnostic entry reports a subagent the Host cannot open, so there is nothing
      // to navigate to; the row that shows it has no press handler either.
      if (entry.kind !== 'child') return
      void router.push({
        pathname: '/session/[sessionId]/subagent',
        params: { mode: entry.mode, parentSessionId: sessionId, sessionId: entry.id },
      })
    },
    [sessionId],
  )
  const interruptSubagentHandler = useCallback(
    (entry: MobileSubagentEntry): void => interruptSubagent.mutate(entry.id),
    [interruptSubagent],
  )
  const loadOlderManually = useCallback((): void => {
    void loadOlderMutateAsync({ manual: true, sessionId }).catch(() => undefined)
  }, [loadOlderMutateAsync, sessionId])

  useEffect(() => {
    setCatalogSheetOpen(false)
    setOlderItems([])
    setOlderHasMore(undefined)
    exhaustedOlderHistory.current = false
    resetLoadOlder()
    // The viewport restores its own reading position once per session open, never on
    // subsequent message arrivals (putting messageCount here wiped loaded older history
    // and re-armed the 1200ms restore jump on every new row).
    resetForSession(sessionId)
  }, [resetForSession, resetLoadOlder, sessionId])

  /**
   * The shared task board, projected once per projection change.
   *
   * `teamTasks` builds a fresh array on every call, so calling it in render handed
   * `NativeTeamTasksRow` new props on every scroll frame. The row returns `null` when the
   * board is empty and a full row when it is not, so a re-render that flipped that
   * condition changed the height of the block above the list — which moves the
   * transcript under the reader.
   */
  const boardTasks = useMemo(() => teamTasks(history.data?.projections?.values), [history.data?.projections?.values])

  /**
   * The rows the list shows while the reader is steering it.
   *
   * Streamed events land several times per second and each one rebuilds the row
   * array; a rebuilt array re-measures cells, and any cell that lands a few points
   * taller than before shifts everything below it. Under a finger that reads as the
   * conversation shaking. Holding the last rows for the duration of the gesture and
   * the settle window keeps the transcript still while it is being read.
   */
  /** First row the viewport shows, for the turn rail's active mark. */
  const [catalogSheetOpen, setCatalogSheetOpen] = useState(false)
  const exportingLog = useRef(false)
  /**
   * The rows in the order an inverted list renders them: newest first.
   *
   * An inverted list anchors its offset at the newest row, so a reply that lands while
   * the reader is at the bottom appears without a scroll call, and one that lands while
   * they are reading history does not move what they are looking at. That is the whole
   * reason for the inversion: no code has to chase the content height.
   */
  const eventBySeq = useMemo(
    () =>
      new Map(sourceItems.flatMap((item) => (typeof item.seq === 'number' ? [[item.seq, item.event] as const] : []))),
    [sourceItems],
  )

  // Unstable list props re-render every mounted cell. The reader's own scroll
  // updates `showReturnToLatest`, so an inline renderItem re-rendered the whole
  // conversation on every scroll frame; these callbacks and the event lookup keep
  // their identity across streaming chunks and scroll renders.
  const eventBySeqRef = useRef(eventBySeq)
  eventBySeqRef.current = eventBySeq
  const getEvent = useCallback(
    (seq: number | undefined) => (seq === undefined ? undefined : eventBySeqRef.current.get(seq)),
    [],
  )
  // The desktop quotes by selecting text in the draft editor. A phone cannot select
  // across a scrolling list reliably, so the row offers the same Markdown blockquote
  // and writes it into the composer draft it would have landed in anyway.
  const quoteIntoDraft = useCallback(
    (text: string) => {
      if (sessionId === undefined) return
      const quoted = formatQuoteText(text)
      const draft = useComposerDraftStore.getState().drafts[sessionId] ?? ''
      useComposerDraftStore
        .getState()
        .setDraft(sessionId, draft.trim() === '' ? `${quoted}\n\n` : `${quoted}\n\n${draft}`)
      tapFeedback()
      showSnackbar(message('conversation.quoted'))
    },
    [sessionId],
  )
  const renderRow = useCallback(
    (row: NativeConversationRow, closing = false) =>
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
          api={client}
          compact={row.kind === 'assistant' && !closing}
          event={getEvent(row.sourceSeq)}
          item={row}
          onBranch={branchFromMessage}
          onQuote={quoteIntoDraft}
          sessionId={sessionId}
          settledReasoningPreview={policy.settledReasoningPreview}
          // Deliberate departure from the desktop: `MessageIconActions` renders only in
          // `TurnTailNodeView` because a pointer can drag-select any earlier block. A phone
          // cannot, and the selection handles inside a scrolling list are hard to grab, so
          // every assistant block carries a copy control; only the closing block repeats the
          // clock, rating and branch action.
          showActions
        />
      ),
    [branchFromMessage, client, getEvent, policy.settledReasoningPreview, quoteIntoDraft, sessionId],
  )
  // Open steps live in ConversationDisclosureContext, not in the row: the list recycles
  // rows, so a disclosure held by the row would collapse whenever it scrolled out of view.
  const disclosures = useConversationDisclosuresState(sessionId)
  const renderGroupRow = useCallback((row: NativeConversationRow) => renderRow(row, false), [renderRow])
  const renderStep = useCallback(
    (row: NativeProcessRow) => <NativeProcessGroup item={row} renderRow={renderGroupRow} />,
    [renderGroupRow],
  )
  // Mirrors desktop `TurnProcessNodeView` + `ChatGroupSeat`: expanding a historical Turn
  // reveals its collapsible step groups (`已读取文件并修改了文件`, `已注入上下文`, etc.).
  const renderTurnMember = useCallback(
    (row: NativeTurnMemberRow) => (row.kind === 'process' ? renderStep(row) : renderRow(row, false)),
    [renderRow, renderStep],
  )
  const renderItem = useCallback(
    ({ item }: { item: TranscriptListEntry }) => {
      const { row, gap, closing } = item
      if (row.kind === 'turn' && row.continuation === true) {
        return <NativeTurnGroup gap={gap} item={row} renderRow={renderTurnMember} />
      }
      const content =
        row.kind === 'turn' ? (
          <NativeTurnGroup item={row} renderRow={renderTurnMember} />
        ) : row.kind === 'process' ? (
          renderStep(row)
        ) : (
          renderRow(row, closing)
        )
      return <View style={CONVERSATION_GAP_STYLES[gap]}>{content}</View>
    },
    [renderRow, renderStep, renderTurnMember],
  )
  const keyExtractor = useCallback((item: TranscriptListEntry) => item.key, [])
  /**
   * Records how far the reader is from the newest message and mirrors it into the
   * return-to-latest control.
   * @param event - Native scroll measurement that produced the current offset.
   * @param releaseLatch - Whether this measurement may move the sticky-latest latch.
   */
  const hasMoreHistory =
    olderHasMore ??
    (recentWindow.truncated || events.data?.windowStartSeq !== undefined || history.data?.hasMore === true)
  const actions = interactions.data?.items.length ?? 0
  const jobItems = jobs.data?.items ?? []
  const headerCounts = {
    jobs: jobItems.length,
    runningJobs: jobItems.filter((job) => job.status === 'running' || job.status === 'queued').length,
    subagents: (subagents.data?.entries ?? []).filter((entry) => entry.kind === 'child').length,
  }
  const headerMenu: HeaderMenuRow[] = [
    ...(headerCounts.subagents > 0 || headerCounts.jobs > 0
      ? [
          {
            icon: 'users-outline' as const,
            label: headerCounts.subagents > 0 ? message('activity.subagents') : message('conversation.jobsTitle'),
            onSelect: () => setCatalogSheetOpen(true),
            value: 'catalog',
          },
        ]
      : []),
    {
      icon: 'edit-outline',
      label: message('conversation.sessionMenuRename'),
      onSelect: () => {
        if (sessionId === undefined) return
        router.push({
          pathname: '/session/[sessionId]/rename',
          params: { sessionId, title: sessionTitle },
        })
      },
      value: 'rename',
    },
    {
      icon: 'archive-outline',
      label: message('conversation.sessionMenuShare'),
      onSelect: () => {
        if (client === undefined || sessionId === undefined || exportingLog.current) return
        exportingLog.current = true
        // The drawer's share path: read every page of history, then hand the file to
        // the system sheet.
        void shareSessionLog(client, { sessionId, title: sessionTitle })
          .then((outcome) => {
            if (outcome === 'empty') showSnackbar(message('log.emptyBody'))
            else if (outcome === 'unsupported') showSnackbar(message('conversation.shareUnsupported'))
          })
          .catch(() => showSnackbar(message('conversation.shareFailed')))
          .finally(() => {
            exportingLog.current = false
          })
      },
      value: 'share',
    },
  ]
  const pendingQuestions = useMemo(
    () =>
      (interactions.data?.items ?? []).flatMap((item) =>
        item.type === 'question/requested' ? item.payload.questions : [],
      ),
    [interactions.data?.items],
  )
  const goal = goalWithActivation(
    goalFromProjection(history.data?.projections?.values),
    liveGoal.isError ? undefined : liveGoal.data?.goal,
  )
  // The desktop registers this dock at order 0, ahead of the goal bar and the queue.
  const todos = todoFromProjection(history.data?.projections?.values)
  const queuedCount = queue.data?.items.filter((item) => item.placement === 'queued').length ?? 0
  const plan = planFromProjection(history.data?.projections?.values)
  const reportedStatus = events.data?.status ?? message('conversation.connecting')
  const running =
    reportedStatus === 'running' ||
    runningTurnStartedAt !== undefined ||
    (events.data === undefined && activeSession?.running === true)
  const status = running ? 'running' : reportedStatus
  // The last turn's own transition, per session: switching into an idle conversation
  // must not buzz for a completion the reader never watched.
  const lastRun = useRef<{ running: boolean; sessionId: string | undefined } | undefined>(undefined)
  useEffect(() => {
    const previous = lastRun.current
    lastRun.current = { running, sessionId }
    if (previous === undefined || previous.sessionId !== sessionId) return
    if (previous.running && !running) doneFeedback()
  }, [running, sessionId])
  // The desktop owns the reading record, so opening this transcript — or a turn finishing
  // in it — tells the Host rather than counting locally. Streaming chunks while running
  // do not re-post on every row.
  const lastReadSnapshot = useRef<SessionReadSnapshot | undefined>(undefined)
  useEffect(() => {
    if (sessionId === undefined) {
      lastReadSnapshot.current = undefined
      return
    }
    const next: SessionReadSnapshot = { client, rowCount: displayRows.length, running, sessionId }
    const shouldMark = shouldMarkSessionRead(lastReadSnapshot.current, next)
    lastReadSnapshot.current = next
    if (!shouldMark) return
    noteSessionRead(sessionId)
    void client?.markSessionRead(sessionId).catch(() => undefined)
  }, [client, displayRows.length, running, sessionId])
  const clearGoalEditRequest = useCallback(() => setGoalEditRequest(0), [])
  const lookupReferences = useMemo(
    () =>
      client === undefined || sessionId === undefined
        ? undefined
        : (query: string, signal: AbortSignal) => client.withSignal(signal).sessionReferences(sessionId, query),
    [client, sessionId],
  )
  const hasTodoDock = todos !== undefined && todos.length > 0
  const hasGoalDock = goal !== undefined && goal.phase !== 'complete'
  const hasQueueDock = queuedCount > 0
  const effectiveOpenDock: ComposerDock | undefined =
    (openDock === 'todo' && hasTodoDock) ||
    (openDock === 'goal' && hasGoalDock) ||
    (openDock === 'queue' && hasQueueDock)
      ? openDock
      : undefined
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
  // `streamStatus` is already subscribed above; derive the displayed status from it
  // instead of opening a second subscription to the same store field.
  const displayStatus =
    !connection || streamStatus === 'disconnected'
      ? 'disconnected'
      : streamStatus === 'connecting'
        ? 'connecting'
        : status

  const listHeader = useMemo(
    () => (
      <>
        {/* A question the Turn is waiting on outranks its clock: the reader
            is the blocker, and the row opens the screen that answers it. */}
        <NativeQuestionPromptRow
          onOpen={() => {
            if (sessionId === undefined) return
            router.push({ pathname: '/session/[sessionId]/interactions', params: { sessionId } })
          }}
          questions={pendingQuestions}
        />
        {status === 'running' ? (
          <View style={s.turnStatusSlot}>
            <NativeTurnStatus showDivider={showRunningDivider} startedAt={runningTurnStartedAt} />
          </View>
        ) : null}
      </>
    ),
    [pendingQuestions, runningTurnStartedAt, s.turnStatusSlot, sessionId, showRunningDivider, status],
  )
  const listFooter = useMemo(
    () => (
      <ConversationLeadingBlocks
        hasMoreHistory={hasMoreHistory}
        interruptingId={interruptSubagent.isPending ? interruptSubagent.variables : undefined}
        jobs={jobs.data?.items ?? []}
        olderState={{ failed: loadOlder.isError, pending: loadOlder.isPending }}
        onInterruptSubagent={interruptSubagentHandler}
        onLoadOlder={loadOlderManually}
        onOpenSubagent={openSubagent}
        showOlderControl={!history.isPending && displayRows.length > 0}
        sourceItems={sourceItems}
        subagents={subagents.data?.entries ?? []}
        tasks={boardTasks}
      />
    ),
    [
      boardTasks,
      displayRows.length,
      hasMoreHistory,
      history.isPending,
      interruptSubagent.isPending,
      interruptSubagent.variables,
      interruptSubagentHandler,
      jobs.data?.items,
      loadOlder.isError,
      loadOlder.isPending,
      loadOlderManually,
      openSubagent,
      sourceItems,
      subagents.data?.entries,
    ],
  )

  return (
    <ConversationDisclosureContext.Provider value={disclosures}>
      <WorkspaceShell
        title={sessionTitle}
        rightAction={
          <View style={s.headerActions}>
            <SessionHeaderActions
              counts={headerCounts}
              modeLabel={agentPresetLabel(activeSession?.agentPreset)}
              menu={headerMenu}
              onOpenJobs={() => setCatalogSheetOpen(true)}
              onOpenPending={() => {
                if (sessionId === undefined) return
                router.push({ pathname: '/session/[sessionId]/interactions', params: { sessionId } })
              }}
              pending={actions}
            />
            <ConnectionStatus onPress={refetchAll} status={displayStatus} />
          </View>
        }
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
              {/* One notice for the three reads a phone cannot tell apart: they fail
                  together when the stream is down, and three identical retry rows
                  said so three times. */}
              {history.isError || events.isError || interactions.isError ? (
                <ErrorNotice
                  text={withErrorContext(
                    message('conversation.refreshFailed'),
                    history.error ?? events.error ?? interactions.error,
                  )}
                  onRetry={() => {
                    if (history.isError) void history.refetch()
                    if (events.isError) void events.refetch()
                    if (interactions.isError) void interactions.refetch()
                  }}
                />
              ) : null}
              <View style={s.listStage}>
                <FlatList
                  style={s.listView}
                  ref={listRef}
                  inverted
                  data={invertedEntries}
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
                  ListFooterComponent={listFooter}
                  ListHeaderComponent={listHeader}
                  ListEmptyComponent={
                    history.isPending ? (
                      <SkeletonConversation />
                    ) : (
                      <Text style={s.empty}>{message('conversation.noMessages')}</Text>
                    )
                  }
                  onContentSizeChange={(_width: number, height: number) => handleContentSizeChange(height)}
                  onMomentumScrollBegin={beginMomentumScroll}
                  onMomentumScrollEnd={settleMomentumScroll}
                  onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                    handleScroll(event)
                    // Reaching for older history should not need a second press on the
                    // button that sits above the rows being requested. The predicate owns
                    // every condition, so the screen only reports what it knows.
                    if (
                      isAtHistoryRunway({
                        hasMore: hasMoreHistory && !history.isPending && displayRows.length > 0,
                        loading: loadOlder.isPending,
                        exhausted: exhaustedOlderHistory.current,
                      })
                    )
                      void loadOlderMutateAsync({ manual: false, sessionId }).catch(() => undefined)
                  }}
                  onScrollBeginDrag={beginReaderScroll}
                  onScrollEndDrag={settleReaderScroll}
                  scrollEventThrottle={16}
                />
                {showReturnToLatest ? (
                  <Pressable
                    android_ripple={{ borderless: false }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      unreadCountLabel(unseenCount) === undefined
                        ? message('conversation.backToLatest')
                        : `${message('conversation.backToLatest')}，${format('conversation.newMessages', { count: unreadCountLabel(unseenCount) as string })}`
                    }
                    onPress={returnToLatest}
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
              {/* The desktop's two header catalogs share one sheet here: the subagent
                  list and the job list are the same tap away on a phone. */}
              <NativeSessionCatalogSheet
                jobs={jobItems}
                onClose={() => setCatalogSheetOpen(false)}
                onOpenSubagent={(entry) =>
                  router.push({
                    pathname: '/session/[sessionId]/subagent',
                    params: { sessionId: entry.id, parentSessionId: sessionId, mode: entry.mode },
                  })
                }
                open={catalogSheetOpen}
                subagents={subagents.data?.entries ?? []}
              />
              <WorkspaceComposer
                key={sessionId ?? 'workspace'}
                agentPreset={activeSession?.agentPreset}
                model={models.data?.current}
                onOpenGoal={() => {
                  if (goal && goal.phase !== 'complete') {
                    setOpenDock('goal')
                    setGoalEditRequest((value) => value + 1)
                  } else {
                    setGoalEditorOpen(true)
                  }
                }}
                header={
                  hasTodoDock || hasGoalDock || hasQueueDock ? (
                    <View style={s.composerContext}>
                      <ComposerDockChips
                        goal={goal}
                        onToggle={(dock) => setOpenDock((current) => (current === dock ? undefined : dock))}
                        open={effectiveOpenDock}
                        queued={queuedCount}
                        todos={todos}
                      />
                      {effectiveOpenDock === 'todo' ? <NativeTodoDock todos={todos} /> : null}
                      {effectiveOpenDock === 'goal' ? (
                        <NativeGoalBar
                          goal={goal}
                          editRequest={goalEditRequest}
                          onEditRequestHandled={clearGoalEditRequest}
                          pending={goalMutation.isPending}
                          onMutate={(action, ref, objective) =>
                            goalMutation.mutateAsync({ action, ref, objective }).then(() => undefined)
                          }
                        />
                      ) : null}
                      {effectiveOpenDock === 'queue' ? (
                        <NativeQueueDock
                          items={queue.data?.items ?? []}
                          onUpdate={(itemId, action) =>
                            updateQueue.mutateAsync({ itemId, action }).then(() => undefined)
                          }
                          running={status === 'running'}
                        />
                      ) : null}
                    </View>
                  ) : undefined
                }
                placeholder={message('conversation.composerPlaceholder')}
                onSend={(content) => send.mutateAsync(content).then(() => undefined)}
                onCancel={() => cancel.mutate()}
                commands={commands.data}
                skills={skills.data}
                lookupReferences={lookupReferences}
                permissions={readPermissionSelect(history.data?.projections?.values.permissions)}
                plan={plan}
                sessionId={sessionId}
                cancelling={cancel.isPending}
                busyEnter={busyEnter}
                disabled={!ready}
                offline={offline}
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
                // The dock stays under both tabs: hiding it on the ledger tab
                // shortened the composer by 26pt every time the reader switched.
                footer={
                  <SessionDock
                    items={sourceItems}
                    performanceUsage={policy.performanceUsage}
                    projectionValues={history.data?.projections?.values}
                  />
                }
              />
            </>
          )}
        </KeyboardAvoidingView>
      </WorkspaceShell>
    </ConversationDisclosureContext.Provider>
  )
}
