import { queryKeys } from '@/api/query-keys'
import { noteSessionRunning } from '@/state/completion-notices'
import type { MobileStreamEvent, SessionEventItem, SessionEventsPayload } from '@/types/mobile'
import type { QueryClient } from '@tanstack/react-query'
import { sessionWindow } from './session-window'

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
    if (item.seq !== undefined && items.some((existing) => existing.seq === item.seq)) return current
    const window = sessionWindow([...items, item])
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
