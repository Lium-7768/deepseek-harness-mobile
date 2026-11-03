import { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { t as message } from '@/locale'
import { mergeEventItems } from '@/sync/event-items'
import { sessionWindow } from '@/sync/session-window'
import type { MobileConnection, SessionEventsPayload } from '@/types/mobile'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useScreenActive } from '@/hooks/use-screen-active'
import { useMemo } from 'react'

/** Reads desktop-owned state; all reads consume the query's cancellation signal. */
export function useSessionQueries(
  client: MobileApi | undefined,
  connection: MobileConnection | undefined,
  sessionId: string | undefined,
) {
  const queryClient = useQueryClient()
  const active = useScreenActive()
  const ready = Boolean(client && sessionId)
  const history = useQuery({
    queryKey: queryKeys.sessionHistory(sessionId),
    enabled: ready,
    queryFn: ({ signal }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).sessionHistory(sessionId)
    },
  })
  const goal = useQuery({
    queryKey: queryKeys.sessionGoal(sessionId),
    enabled: ready && active,
    queryFn: ({ signal }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).sessionGoal(sessionId)
    },
    // Activation can change without a durable event; poll only while this screen is foregrounded.
    refetchInterval: active ? 5_000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  })
  const events = useQuery({
    staleTime: Infinity, // Explicit stream invalidation marks an uncertain status stale; elapsed time alone does not.
    queryKey: queryKeys.sessionEvents(sessionId),
    enabled: ready,
    queryFn: ({ signal }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      const current = queryClient.getQueryData<SessionEventsPayload>(queryKeys.sessionEvents(sessionId))
      const cursor = current?.since ?? 0
      return client
        .withSignal(signal)
        .sessionEvents(sessionId, cursor)
        .then((page) => {
          // SSE may append while the read is in flight; merge against the latest cache.
          const latest = queryClient.getQueryData<SessionEventsPayload>(queryKeys.sessionEvents(sessionId))
          const window = sessionWindow(mergeEventItems(latest?.items ?? [], page.items))
          return {
            ...page,
            since: Math.max(cursor, latest?.since ?? 0, ...page.items.map((item) => item.seq ?? 0)),
            items: window.items,
            windowStartSeq: window.truncated ? window.items[0]?.seq : latest?.windowStartSeq,
          }
        })
    },
  })
  const queue = useQuery({
    queryKey: queryKeys.sessionQueue(sessionId),
    enabled: ready,
    queryFn: ({ signal }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).sessionQueue(sessionId)
    },
  })
  const jobs = useQuery({
    queryKey: queryKeys.sessionJobs(sessionId),
    enabled: ready,
    queryFn: ({ signal }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).sessionJobs(sessionId)
    },
  })
  const subagents = useQuery({
    queryKey: queryKeys.sessionSubagents(sessionId),
    enabled: ready,
    queryFn: ({ signal }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).subagents(sessionId)
    },
  })
  const interactions = useQuery({
    queryKey: queryKeys.sessionInteractions(sessionId),
    enabled: ready,
    queryFn: ({ signal }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).pendingInteractions(sessionId)
    },
  })
  const sessionList = useQuery({
    queryKey: queryKeys.sessionList(connection?.gatewayUrl, connection?.deviceId),
    enabled: Boolean(connection),
    queryFn: ({ signal }) => {
      if (!client) throw new Error(message('drawer.connectFirstBody'))
      return client.withSignal(signal).listSessions()
    },
  })
  const activeSession = useMemo(
    () => sessionList.data?.items.find((item) => item.sessionId === sessionId),
    [sessionId, sessionList.data?.items],
  )
  const models = useQuery({
    queryKey: queryKeys.sessionModels(connection?.gatewayUrl, connection?.deviceId, sessionId),
    enabled: ready,
    queryFn: ({ signal }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).sessionModels(sessionId)
    },
  })
  const presets = useQuery({
    queryKey: queryKeys.agentPresets(connection?.gatewayUrl, connection?.deviceId),
    enabled: client !== undefined,
    queryFn: ({ signal }) => {
      if (!client) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).agentPresets()
    },
  })
  return { goal, history, events, queue, jobs, subagents, interactions, sessionList, activeSession, models, presets }
}
