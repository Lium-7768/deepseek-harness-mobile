import { useConnectionStore } from '@/state/connection'
import { useMobileSyncStore } from '@/state/mobile-sync'
import { startMobileSync } from '@/sync/runtime'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { fetch } from 'expo/fetch'
import { useEffect } from 'react'
import { AppState } from 'react-native'

/** React owns foreground lifecycle; transport and cache projection are framework-independent. */
export function MobileSyncBridge(): null {
  const connection = useConnectionStore((state) => state.connection)
  const queryClient = useQueryClient()
  const generation = useMobileSyncStore((state) => state.generation)
  useEffect(() => {
    let stop: (() => void) | undefined
    const update = (): void => {
      stop?.()
      stop = undefined
      if (!connection || AppState.currentState !== 'active') return
      stop = startMobileSync({
        connection,
        queryClient,
        fetchStream: fetch,
        setStatus: useMobileSyncStore.getState().setStatus,
        markEvent: useMobileSyncStore.getState().markEvent,
        onUnauthorized: () => {
          queryClient.clear()
          void useConnectionStore
            .getState()
            .forgetConnection()
            .catch(() => undefined) // In-memory credentials are cleared even when Keychain deletion fails.
            .finally(() => router.replace('/connect'))
        },
      })
    }
    update()
    const subscription = AppState.addEventListener('change', update)
    return () => {
      subscription.remove()
      stop?.()
    }
  }, [connection, generation, queryClient])
  return null
}
