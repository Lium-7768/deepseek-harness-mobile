import { MobileApi, MobileApiError } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { isGoalView } from '@/api/goal-payload'
import { tapFeedback, warnFeedback } from '@/components/haptics'
import { requestCompletionPermission } from '@/state/completion-notices'
import { withErrorContext } from '@/components/route-params'
import { t as message } from '@/locale'
import type { MobilePromptContent, SessionEventsPayload } from '@/types/mobile'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useRef } from 'react'
import { Alert } from 'react-native'

/** Commands retain their desktop authority and never retry ambiguous outcomes automatically. */
export function useSessionActions(
  client: MobileApi | undefined,
  sessionId: string | undefined,
  onSent: () => void,
  /** Delivery mode for a prompt sent while the agent is running. */
  busyMode: () => 'queue' | 'steer' = () => 'queue',
) {
  const queryClient = useQueryClient()
  const retrySend = useRef<(content: MobilePromptContent) => void>(() => undefined)
  /**
   * Runs one session command once a client and a session exist.
   *
   * Every command on this screen shares that precondition, so it is stated once. It runs
   * inside the mutation rather than at render: a command cannot be issued before a
   * conversation is open, but the screen renders before one is.
   *
   * @param command - The client call to make.
   * @returns The command's result.
   */
  const run = <T>(command: (api: MobileApi, sessionId: string) => Promise<T>): Promise<T> => {
    if (!client || !sessionId) return Promise.reject(new Error(message('conversation.openFromList')))
    return command(client, sessionId)
  }
  const branch = useMutation({
    mutationFn: (atSeq: number) => {
      return run((api, id) => api.forkSession(id, atSeq))
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionList() })
      router.push({ pathname: '/session/[sessionId]', params: { sessionId: created.sessionId } })
    },
    onError: (error) =>
      Alert.alert(
        message('conversation.branchFailedTitle'),
        withErrorContext(message('conversation.branchFailedTitle'), error),
      ),
  })
  const send = useMutation({
    mutationFn: (content: MobilePromptContent) => {
      return run((api, id) => api.sendMessage(id, content, busyMode()))
    },
    onSuccess: () => {
      tapFeedback()
      // The first accepted send is the first moment a completion notice could matter,
      // and the only moment iOS offers the permission prompt without an explanation gap.
      void requestCompletionPermission()
      // The reader's own prompt is the one row a send must reveal: without this
      // the list stays where it was and a prompt sent from the phone is only
      // found by scrolling.
      onSent()
      queryClient.setQueryData<SessionEventsPayload>(queryKeys.sessionEvents(sessionId), (current) => ({
        ...current,
        since: current?.since ?? 0,
        items: current?.items ?? [],
        status: 'running',
      }))
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionEvents(sessionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionQueue(sessionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionJobs(sessionId) }),
      ])
    },
    onError: (error, content) =>
      Alert.alert(
        message('conversation.sendFailedTitle'),
        withErrorContext(message('conversation.sendFailedBody'), error),
        [
          { text: message('common.close'), style: 'cancel' },
          ...(error instanceof MobileApiError && (error.kind === 'timeout' || error.kind === 'network')
            ? []
            : [{ text: message('common.retryAction'), onPress: () => retrySend.current(content) }]),
        ],
      ),
  })
  retrySend.current = send.mutate
  const updateQueue = useMutation({
    mutationFn: ({ itemId, action }: { itemId: string; action: Record<string, unknown> }) => {
      return run((api, id) => api.updateQueue(id, itemId, action))
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.sessionQueue(sessionId) }),
  })
  const cancel = useMutation({
    mutationFn: () => {
      return run((api, id) => api.cancelSession(id))
    },
    onSuccess: () => {
      warnFeedback()
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionEvents(sessionId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) })
    },
    onError: (error) =>
      Alert.alert(
        message('conversation.stopFailedTitle'),
        withErrorContext(message('conversation.stopFailedBody'), error),
      ),
  })
  const goalMutation = useMutation({
    mutationFn: ({
      action,
      ref,
      objective,
    }: {
      action: 'edit' | 'pause' | 'resume' | 'clear'
      ref: { id: string; revision: number }
      objective?: string
    }) => {
      return run((api, id) => api.mutateGoal(id, action, ref, objective === undefined ? {} : { objective }))
    },
    onSuccess: (result, { action }) => {
      if (action === 'clear') queryClient.setQueryData(queryKeys.sessionGoal(sessionId), { goal: null })
      else if (isGoalView(result)) queryClient.setQueryData(queryKeys.sessionGoal(sessionId), { goal: result })
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionGoal(sessionId) }),
      ]).then(() => undefined)
    },
    onError: (error) =>
      Alert.alert(
        message('conversation.goalFailedTitle'),
        withErrorContext(message('conversation.goalFailedBody'), error),
      ),
  })
  const createGoalMutation = useMutation({
    mutationFn: (objective: string) => {
      return run((api, id) => api.createGoal(id, objective))
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionGoal(sessionId) }),
      ]).then(() => undefined),
    onError: (error) =>
      Alert.alert(
        message('conversation.goalFailedTitle'),
        withErrorContext(message('conversation.goalFailedBody'), error),
      ),
  })
  const interruptSubagent = useMutation({
    mutationFn: (childSessionId: string) => {
      return run((api, id) => api.interruptSubagent(id, childSessionId))
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSubagents(sessionId) }),
    onError: (error) =>
      Alert.alert(
        message('conversation.subagentStopFailedTitle'),
        withErrorContext(message('conversation.subagentStopFailedBody'), error),
      ),
  })
  return {
    branch,
    send,
    updateQueue,
    cancel,
    goalMutation,
    createGoalMutation,
    interruptSubagent,
  }
}
