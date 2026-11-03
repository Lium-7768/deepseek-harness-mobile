import type { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { withErrorContext } from '@/components/route-params'
import { permissionOptionsLocked } from '@/components/session-route-logic'
import { createPermissionConfirmation } from '@/components/permission-confirmation'
import { createSelectionGate, permissionSelectionDecision } from '@/components/session-selection-logic'
import { t as message } from '@/locale'
import { useMobileSyncStore } from '@/state/mobile-sync'
import type { MobileModelSelection, MobilePermissionSelect, MobileSyncStatus } from '@/types/mobile'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Alert } from 'react-native'

type State = {
  client?: MobileApi
  sessionId?: string
  permissions?: MobilePermissionSelect
  model?: MobileModelSelection
  agentPreset?: string
  eventsError: boolean
  eventsPending: boolean
  eventsStale: boolean
  status?: string
  unavailable: boolean
}

/** Shared by the hero and conversation. Confirmation rechecks live state and session identity before sending. */
export function useSessionSelections(state: State) {
  const syncStatus = useMobileSyncStore((snapshot) => snapshot.status)
  const queryClient = useQueryClient()
  const gate = useRef(createSelectionGate()).current
  const confirmation = useRef(createPermissionConfirmation()).current
  const current = useRef({ ...state, syncStatus })
  current.current = { ...state, syncStatus }
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      confirmation.dismiss()
    }
  }, [confirmation])
  useEffect(() => confirmation.dismiss, [confirmation, state.client, state.sessionId])
  const refresh = async (sessionId: string): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionEvents(sessionId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionModels() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionList() }),
    ])
  }
  const permission = useMutation({
    mutationFn: ({ client, sessionId, value }: { client: MobileApi; sessionId: string; value: string }) =>
      client.sendMessage(sessionId, [{ type: 'text', text: `/permission ${value}` }]),
    onSuccess: (_result, variables) => refresh(variables.sessionId),
    onError: (error) =>
      Alert.alert(
        message('permission.switchFailedTitle'),
        withErrorContext(message('permission.switchFailedBody'), error),
      ),
  })
  const model = useMutation({
    mutationFn: ({
      client,
      sessionId,
      selection,
    }: {
      client: MobileApi
      sessionId: string
      selection: MobileModelSelection
    }) => client.selectSessionModel(sessionId, selection),
    onSuccess: (_result, variables) => refresh(variables.sessionId),
    onError: (error) =>
      Alert.alert(message('model.switchFailedTitle'), withErrorContext(message('model.switchFailedBody'), error)),
  })
  const preset = useMutation({
    mutationFn: ({ client, sessionId, value }: { client: MobileApi; sessionId: string; value: string }) =>
      client.selectSessionPreset(sessionId, value),
    onSuccess: (_result, variables) => refresh(variables.sessionId),
    onError: (error) =>
      Alert.alert(message('mode.switchFailedTitle'), withErrorContext(message('mode.switchFailedBody'), error)),
  })
  const pending = permission.isPending || model.isPending || preset.isPending
  const locked = (snapshot: State & { syncStatus: MobileSyncStatus }): boolean =>
    snapshot.unavailable ||
    snapshot.syncStatus !== 'connected' ||
    !snapshot.client ||
    !snapshot.sessionId ||
    permissionOptionsLocked({ ...snapshot, status: snapshot.status, submitting: gate.busy })
  const selectPermission = (value: string): void => {
    const snapshot = current.current
    if (confirmation.busy) return
    const decision = permissionSelectionDecision(value, snapshot.permissions, locked(snapshot))
    if (decision === 'ignore') return
    const submit = (): void => {
      const latest = current.current
      if (
        !mounted.current ||
        latest.client !== snapshot.client ||
        latest.sessionId !== snapshot.sessionId ||
        permissionSelectionDecision(value, latest.permissions, locked(latest)) === 'ignore' ||
        !latest.client ||
        !latest.sessionId
      )
        return
      const { client, sessionId } = latest
      void gate.run(() => permission.mutateAsync({ client, sessionId, value })).catch(() => undefined)
    }
    if (decision === 'confirm') {
      const token = confirmation.begin()
      try {
        Alert.alert(
          message('settings.fullAccessTitle'),
          message('permission.fullAccessBody'),
          [
            {
              text: message('common.cancel'),
              style: 'cancel',
              onPress: () => {
                confirmation.finish(token)
              },
            },
            {
              text: message('common.continue'),
              style: 'destructive',
              onPress: () => {
                if (confirmation.finish(token)) submit()
              },
            },
          ],
          {
            cancelable: true,
            onDismiss: () => {
              confirmation.finish(token)
            },
          },
        )
      } catch {
        confirmation.finish(token)
      }
    } else submit()
  }
  const selectModel = (selection: MobileModelSelection): void => {
    const latest = current.current
    if (latest.unavailable || !latest.client || !latest.sessionId || gate.busy) return
    if (
      latest.model?.provider === selection.provider &&
      latest.model.model === selection.model &&
      latest.model.reasoningEffort === selection.reasoningEffort
    )
      return
    const { client, sessionId } = latest
    void gate.run(() => model.mutateAsync({ client, sessionId, selection })).catch(() => undefined)
  }
  const selectPreset = (value: string): void => {
    const latest = current.current
    if (
      latest.unavailable ||
      !latest.client ||
      !latest.sessionId ||
      gate.busy ||
      value === (latest.agentPreset ?? 'standard')
    )
      return
    const { client, sessionId } = latest
    void gate.run(() => preset.mutateAsync({ client, sessionId, value })).catch(() => undefined)
  }
  return {
    selectPermission,
    selectModel,
    selectPreset,
    pending,
    permissionPending: permission.isPending,
    modelPending: model.isPending,
    presetPending: preset.isPending,
    permissionLocked:
      state.unavailable ||
      syncStatus !== 'connected' ||
      !state.client ||
      !state.sessionId ||
      permissionOptionsLocked({ ...state, status: state.status, submitting: pending }),
  }
}
