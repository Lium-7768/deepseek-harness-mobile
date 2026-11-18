import { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { sessionEventsOptions } from '@/api/session-query-options'
import { t as message } from '@/locale'
import type { MobileConnection, MobileGoalView } from '@/types/mobile'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useScreenActive } from '@/hooks/use-screen-active'
import { useMemo } from 'react'

/**
 * Builds a session-scoped query whose function cannot see a missing client or session.
 *
 * React Query runs `queryFn` in a callback that has no access to the guards the hook body
 * already computed, so every caller used to repeat the same two checks. Narrowing once
 * here keeps the guard in one place and makes the endpoint call the only statement left.
 *
 * @param client - The paired client, or undefined before a pairing exists.
 * @param sessionId - The conversation being read.
 * @param read - The endpoint call, with the signal already applied by the caller's client.
 * @returns A query factory plus the client to call it through.
 */
function sessionReader(
  client: MobileApi | undefined,
  sessionId: string | undefined,
):
  | (<T>(read: (api: MobileApi, sessionId: string) => Promise<T>) => (context: { signal: AbortSignal }) => Promise<T>)
  | undefined {
  if (client === undefined || sessionId === undefined) return undefined
  const scoped = client
  const id = sessionId
  return <T>(read: (api: MobileApi, sessionId: string) => Promise<T>) =>
    ({ signal }: { signal: AbortSignal }): Promise<T> =>
      read(scoped.withSignal(signal), id)
}

/**
 * Reads the desktop-owned state one conversation needs.
 *
 * Every query is disabled until a client and a session exist, because the Host is the
 * only owner of this state and a phone cannot answer for it.
 *
 * @param client - The paired client, or undefined before a pairing exists.
 * @param connection - The pairing, used in cache keys so two gateways cannot collide.
 * @param sessionId - The conversation being read.
 * @returns The queries and the session entry they resolve to.
 */
export function useSessionQueries(
  client: MobileApi | undefined,
  connection: MobileConnection | undefined,
  sessionId: string | undefined,
) {
  const queryClient = useQueryClient()
  const active = useScreenActive()
  const ready = Boolean(client && sessionId)
  const read = sessionReader(client, sessionId)
  /**
   * Wraps a session-scoped endpoint call.
   *
   * The guard runs when the query function runs, not when this hook renders: a query is
   * disabled until a client and a session exist, so the missing case is a query that
   * never starts rather than a render that throws.
   *
   * @param call - The endpoint call, given the client and session it reads.
   * @returns A query function for that call.
   */
  const sessionQuery =
    <T>(call: (api: MobileApi, sessionId: string) => Promise<T>) =>
    (context: { signal: AbortSignal }): Promise<T> => {
      if (read === undefined) throw new Error(message('conversation.openFromList'))
      return read(call)(context)
    }
  const scope = { gatewayUrl: connection?.gatewayUrl, deviceId: connection?.deviceId }

  const history = useQuery({
    queryKey: queryKeys.sessionHistory(sessionId),
    enabled: ready,
    queryFn: sessionQuery((api, id) => api.sessionHistory(id)),
  })
  const goal = useQuery({
    queryKey: queryKeys.sessionGoal(sessionId),
    enabled: ready && active,
    queryFn: sessionQuery<{ goal: MobileGoalView | null }>((api, id) => api.sessionGoal(id)),
    // Keep one initial read and the stream refresh, but poll only while an unfinished Goal
    // exists: a settled Goal cannot change on its own.
    refetchInterval: (query) =>
      active && query.state.data?.goal && query.state.data.goal.phase !== 'complete' ? 5_000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  })
  const events = useQuery(sessionEventsOptions(queryClient, client, sessionId))
  const queue = useQuery({
    queryKey: queryKeys.sessionQueue(sessionId),
    enabled: ready,
    queryFn: sessionQuery((api, id) => api.sessionQueue(id)),
  })
  const jobs = useQuery({
    queryKey: queryKeys.sessionJobs(sessionId),
    enabled: ready,
    queryFn: sessionQuery((api, id) => api.sessionJobs(id)),
  })
  const subagents = useQuery({
    queryKey: queryKeys.sessionSubagents(sessionId),
    enabled: ready,
    queryFn: sessionQuery((api, id) => api.subagents(id)),
  })
  const interactions = useQuery({
    queryKey: queryKeys.sessionInteractions(sessionId),
    enabled: ready,
    queryFn: sessionQuery((api, id) => api.pendingInteractions(id)),
  })
  const sessionList = useQuery({
    queryKey: queryKeys.sessionList(scope.gatewayUrl, scope.deviceId),
    enabled: Boolean(connection),
    queryFn: ({ signal }) => {
      if (client === undefined) throw new Error(message('drawer.connectFirstBody'))
      return client.withSignal(signal).listSessions()
    },
  })
  const activeSession = useMemo(
    () => sessionList.data?.items.find((item) => item.sessionId === sessionId),
    [sessionId, sessionList.data?.items],
  )
  const models = useQuery({
    queryKey: queryKeys.sessionModels(scope.gatewayUrl, scope.deviceId, sessionId),
    enabled: ready,
    queryFn: sessionQuery((api, id) => api.sessionModels(id)),
  })
  // The `/` trigger menu reads these; a failure leaves the menu empty rather than blocking
  // the composer, so they keep their own error state and skip the retry.
  const commands = useQuery({
    queryKey: queryKeys.sessionCommands(scope.gatewayUrl, scope.deviceId, sessionId),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
    queryFn: sessionQuery((api, id) => api.commands(id)),
  })
  const skills = useQuery({
    queryKey: queryKeys.sessionSkills(scope.gatewayUrl, scope.deviceId, sessionId),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
    queryFn: sessionQuery((api, id) => api.sessionSkills(id)),
  })
  const presets = useQuery({
    queryKey: queryKeys.agentPresets(scope.gatewayUrl, scope.deviceId),
    enabled: client !== undefined,
    queryFn: ({ signal }) => {
      if (client === undefined) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).agentPresets()
    },
  })
  /** Shares the settings query the settings screen already uses: one cached read per pairing. */
  const settings = useQuery({
    queryKey: queryKeys.settings(scope.gatewayUrl, scope.deviceId),
    enabled: Boolean(client),
    staleTime: 60_000,
    queryFn: ({ signal }) => {
      if (client === undefined) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).settingsDescribe()
    },
  })
  return {
    settings,
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
    skills,
  }
}
