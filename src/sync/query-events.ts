import { queryKeys } from '@/api/query-keys'
import { noteInteractionRequested, noteSessionRunning } from '@/state/completion-notices'
import type { MobileStreamEvent, SessionEventItem, SessionEventsPayload } from '@/types/mobile'
import type { QueryClient } from '@tanstack/react-query'
import { LIVE_WINDOW_LIMIT, sessionWindow } from './session-window'

export function applyMobileStreamEvent(queryClient: QueryClient, event: MobileStreamEvent): void {
  const sessionId = event.sessionId
  switch (event.type) {
    case 'session/event':
      if (sessionId === undefined || event.payload.event === undefined) return
      appendSessionEvent(queryClient, sessionId, event)
      if (isGoalEvent(event.payload.event))
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessionGoal(sessionId) })
      if (isGoalEvent(event.payload.event) || isTurnEnd(event.payload.event))
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) })
      return
    case 'session/queue':
      if (sessionId === undefined || !Array.isArray(event.payload.items)) return
      queryClient.setQueryData(queryKeys.sessionQueue(sessionId), { items: event.payload.items })
      return
    case 'session/jobs':
      if (sessionId === undefined || !Array.isArray(event.payload.jobs)) return
      queryClient.setQueryData(queryKeys.sessionJobs(sessionId), { items: event.payload.jobs })
      return
    case 'approval/requested':
    case 'approval/resolved':
    case 'question/requested':
    case 'question/resolved':
      if (sessionId !== undefined)
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessionInteractions(sessionId) })
      // A turn that stops for an answer cannot continue without the reader, so the two
      // request events are worth a notice; the resolutions are not.
      if (sessionId !== undefined && event.type === 'question/requested')
        void noteInteractionRequested(sessionId, 'ask', firstQuestion(event.payload))
      if (sessionId !== undefined && event.type === 'approval/requested')
        void noteInteractionRequested(sessionId, 'approve', approvalTool(event.payload))
      return
    case 'host/session-status':
      if (sessionId !== undefined && typeof event.payload.running === 'boolean') {
        updateSessionStatus(queryClient, sessionId, event.payload.running)
        noteSessionRunning(sessionId, event.payload.running)
      }
      return
    case 'host/session-added':
    case 'host/session-removed':
    case 'host/workspace-changed':
    case 'host/workspace-removed':
    case 'host/workspace-order-changed':
    case 'host/archived-sessions-changed':
      void queryClient.invalidateQueries({ predicate: (query) => isSessionListQuery(query.queryKey) })
      return
    case 'gateway/ready':
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionGoal() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionEvents() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionInteractions() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionQueue() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionJobs() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSubagents() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.subagentHistory() })
      void queryClient.invalidateQueries({ predicate: (query) => isSessionListQuery(query.queryKey) })
      return
    case 'session/subscribed':
      return
    default:
      if (sessionId !== undefined) void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) })
  }
}

function isGoalEvent(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).type === 'string' &&
    ((value as Record<string, unknown>).type as string).startsWith('goal/')
  )
}

function appendSessionEvent(queryClient: QueryClient, sessionId: string, streamEvent: MobileStreamEvent): void {
  const item: SessionEventItem = {
    ...(streamEvent.seq === undefined ? {} : { seq: streamEvent.seq }),
    ...(streamEvent.payload.view === undefined ? {} : { view: streamEvent.payload.view }),
    event: streamEvent.payload.event as Record<string, unknown>,
  }
  queryClient.setQueryData<SessionEventsPayload>(queryKeys.sessionEvents(sessionId), (current) => {
    const items = current?.items ?? []
    if (item.seq !== undefined) {
      // Events arrive in seq order, so the duplicate that matters is the one just
      // applied; the scan stays only for the out-of-order snapshot merge.
      const last = items[items.length - 1]
      if (last?.seq === item.seq) return current
      if (items.some((existing) => existing.seq === item.seq)) return current
    }
    const next = [...items, item]
    // Compaction only changes when a step settles: an assistant/message replaces its
    // own transient chunks, so any other event copies the window forward as it was.
    // Running sessionWindow per event rebuilt its set over the whole window each time;
    // the over-limit guard keeps the original truncation bound without paying for it.
    const window =
      item.event.type === 'assistant/message' || next.length > LIVE_WINDOW_LIMIT
        ? sessionWindow(next)
        : { items: next, truncated: false }
    return {
      since: Math.max(current?.since ?? 0, item.seq ?? 0),
      items: window.items,
      windowStartSeq: window.truncated ? window.items[0]?.seq : current?.windowStartSeq,
      status: statusAfterSessionEvent(current?.status, item.event),
    }
  })
}

function statusAfterSessionEvent(
  current: SessionEventsPayload['status'] | undefined,
  event: Record<string, unknown>,
): SessionEventsPayload['status'] {
  if (event.type === 'turn/start') return 'running'
  if (event.type === 'turn/end' || event.type === 'turn/error') return 'idle'
  return current ?? 'idle'
}

function updateSessionStatus(queryClient: QueryClient, sessionId: string, running: boolean): void {
  queryClient.setQueryData<SessionEventsPayload>(queryKeys.sessionEvents(sessionId), (current) => ({
    ...current,
    since: current?.since ?? 0,
    items: current?.items ?? [],
    status: running ? 'running' : 'idle',
  }))
}

function isSessionListQuery(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === 'session-list' || queryKey[0] === 'session-list-for-session'
}

function isTurnEnd(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  return (value as Record<string, unknown>).type === 'turn/end'
}

/** The first question in a `question/requested` payload, for the notice's detail line. */
function firstQuestion(payload: Record<string, unknown>): string | undefined {
  const questions = payload.questions
  if (!Array.isArray(questions)) return undefined
  const first: unknown = questions[0]
  if (first === null || typeof first !== 'object') return undefined
  const text = (first as Record<string, unknown>).question
  return typeof text === 'string' ? text : undefined
}

/** The tool name in an `approval/requested` payload, for the notice's detail line. */
function approvalTool(payload: Record<string, unknown>): string | undefined {
  const tool = payload.toolName
  return typeof tool === 'string' ? tool : undefined
}
