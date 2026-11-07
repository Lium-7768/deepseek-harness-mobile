import { noteAppState, noteSessionList } from '@/state/completion-notices'
import { useConnectionStore } from '@/state/connection'
import { useMobileSyncStore } from '@/state/mobile-sync'
import type { SessionListPayload } from '@/types/mobile'
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
    noteAppState(AppState.currentState)
    update()
    const subscription = AppState.addEventListener('change', (state) => {
      // Recorded before the stream restarts: the resumed list is what answers which
      // sessions finished while the app was not listening.
      noteAppState(state)
      update()
    })
    return () => {
      subscription.remove()
      stop?.()
    }
  }, [connection, generation, queryClient])
  useEffect(() => {
    // The list is the only place a completion shows up once the stream was stopped while
    // the app was away; every refresh feeds the tracker so the return can report it.
    const cache = queryClient.getQueryCache()
    return cache.subscribe((event) => {
      if (event.type !== 'updated') return
      const key = event.query.queryKey
      if (key[0] !== 'session-list') return
      const data = event.query.state.data as SessionListPayload | undefined
      if (Array.isArray(data?.items)) noteSessionList(data.items)
    })
  }, [queryClient])
  return null
}
