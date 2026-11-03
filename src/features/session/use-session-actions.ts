import { MobileApi, MobileApiError } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { withErrorContext } from '@/components/route-params'
import { t as message } from '@/locale'
import type { MobileConnection, MobilePromptContent, SessionEventsPayload } from '@/types/mobile'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useRef } from 'react'
import { Alert } from 'react-native'

/** Commands retain their desktop authority and never retry ambiguous outcomes automatically. */
export function useSessionActions(
  client: MobileApi | undefined,
  connection: MobileConnection | undefined,
  sessionId: string | undefined,
  onSent: () => void,
) {
  const queryClient = useQueryClient()
  const retrySend = useRef<(content: MobilePromptContent) => void>(() => undefined)
  const selectModelMutation = useMutation({
    mutationFn: (selection: { model: string; provider: string; reasoningEffort?: string }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.selectSessionModel(sessionId, selection)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sessionModels(connection?.gatewayUrl, connection?.deviceId, sessionId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) })
    },
    onError: (error) =>
      Alert.alert(message('model.switchFailedTitle'), withErrorContext(message('model.switchFailedBody'), error)),
  })
  const selectPresetMutation = useMutation({
    mutationFn: (agentPreset: string) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.selectSessionPreset(sessionId, agentPreset)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) })
    },
    onError: (error) =>
      Alert.alert(message('mode.switchFailedTitle'), withErrorContext(message('mode.switchFailedBody'), error)),
  })
  const selectPermissionMutation = useMutation({
    mutationFn: (preset: string) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.sendMessage(sessionId, [{ type: 'text', text: `/permission ${preset}` }])
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionEvents(sessionId) })
    },
    onError: (error) =>
      Alert.alert(
        message('permission.switchFailedTitle'),
        withErrorContext(message('permission.switchFailedBody'), error),
      ),
  })
  const branch = useMutation({
    mutationFn: (atSeq: number) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.forkSession(sessionId, atSeq)
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
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.sendMessage(sessionId, content)
    },
    onSuccess: () => {
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
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.updateQueue(sessionId, itemId, action)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.sessionQueue(sessionId) }),
  })
  const cancel = useMutation({
    mutationFn: () => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.cancelSession(sessionId)
    },
    onSuccess: () => {
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
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.mutateGoal(sessionId, action, ref, objective === undefined ? {} : { objective })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) }),
    onError: (error) =>
      Alert.alert(
        message('conversation.goalFailedTitle'),
        withErrorContext(message('conversation.goalFailedBody'), error),
      ),
  })
  const interruptSubagent = useMutation({
    mutationFn: (childSessionId: string) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.interruptSubagent(sessionId, childSessionId)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSubagents(sessionId) }),
    onError: (error) =>
      Alert.alert(
        message('conversation.subagentStopFailedTitle'),
        withErrorContext(message('conversation.subagentStopFailedBody'), error),
      ),
  })
  return {
    selectModelMutation,
    selectPresetMutation,
    selectPermissionMutation,
    branch,
    send,
    updateQueue,
    cancel,
    goalMutation,
    interruptSubagent,
  }
}
