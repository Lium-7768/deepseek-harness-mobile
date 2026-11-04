import { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { sessionEventsOptions } from '@/api/session-query-options'
import { t as message } from '@/locale'
import type { MobileConnection } from '@/types/mobile'
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
    // Keep one initial read/SSE refresh, but only poll while an unfinished Goal exists.
    refetchInterval: (query) =>
      active && query.state.data?.goal && query.state.data.goal.phase !== 'complete' ? 5_000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  })
  const events = useQuery(sessionEventsOptions(queryClient, client, sessionId))
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
  // The `/` trigger menu reads this; a failure leaves the menu empty rather than
  // blocking the composer, so it keeps the query's own error state.
  const commands = useQuery({
    queryKey: queryKeys.sessionCommands(connection?.gatewayUrl, connection?.deviceId, sessionId),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
    queryFn: ({ signal }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).commands(sessionId)
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
  return {
    goal,
    history,
    events,
    queue,
    jobs,
    subagents,
    interactions,
    sessionList,
    activeSession,
    models,
    presets,
    commands,
  }
}
