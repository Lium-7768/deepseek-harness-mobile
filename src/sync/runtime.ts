import { MobileApi, mobileAuthorization } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import type { MobileConnection, MobileSyncStatus, SessionEventItem, SessionEventsPayload } from '@/types/mobile'
import type { QueryClient } from '@tanstack/react-query'
import { requiresRePair } from './errors'
import { consumeEventStream, type StreamFetch } from './event-stream'
import { applyMobileStreamEvent } from './query-events'
import { sessionWindow } from './session-window'

const RETRY_DELAYS = [1_000, 2_000, 5_000, 10_000]
const HANDSHAKE_TIMEOUT = 15_000
// Gateway emits a comment heartbeat regularly, including while sessions are idle.
const IDLE_TIMEOUT = 45_000

interface SyncOptions {
  connection: MobileConnection
  queryClient: QueryClient
  fetchStream: StreamFetch
  setStatus(status: MobileSyncStatus): void
  markEvent(): void
  onUnauthorized(): void
}

/** One foreground connection lifetime. Stopping it invalidates all pending callbacks and HTTP work. */
export function startMobileSync(options: SyncOptions): () => void {
  const { connection, queryClient, setStatus } = options
  let stopped = false
  let attempt = 0
  let retry: ReturnType<typeof setTimeout> | undefined
  let active: AbortController | undefined

  const open = (): void => {
    if (stopped) return
    const controller = new AbortController()
    active = controller
    const valid = (): boolean => !stopped && !controller.signal.aborted && active === controller
    const api = new MobileApi(connection, { signal: controller.signal })
    const subscribed = new Set<string>()
    const pending = new Set<string>()
    const seen = new Set<string>()
    let ready = false
    let watchdog: ReturnType<typeof setTimeout>
    const armWatchdog = (delay: number): void => {
      clearTimeout(watchdog)
      watchdog = setTimeout(() => {
        if (!valid()) return
        controller.abort()
        reconnect()
      }, delay)
    }
    const reconnect = (): void => {
      clearTimeout(watchdog)
      if (stopped || active !== controller || retry !== undefined) return
      controller.abort()
      setStatus('disconnected')
      const delay = RETRY_DELAYS[Math.min(attempt++, RETRY_DELAYS.length - 1)]
      retry = setTimeout(() => {
        retry = undefined
        open()
      }, delay)
    }
    const hydrate = async (sessionId: string): Promise<void> => {
      if (!valid() || subscribed.has(sessionId) || pending.has(sessionId)) return
      pending.add(sessionId)
      try {
        const cursor = queryClient.getQueryData<SessionEventsPayload>(queryKeys.sessionEvents(sessionId))?.since ?? 0
        const subscription = await api.createSessionSubscription(sessionId, cursor)
        if (!valid()) return
        queryClient.setQueryData<SessionEventsPayload>(queryKeys.sessionEvents(sessionId), (current) => {
          const window = sessionWindow(mergeItems(current?.items ?? [], subscription.snapshot.items))
          return {
            ...current,
            since: Math.max(current?.since ?? 0, subscription.snapshotSeq),
            items: window.items,
            windowStartSeq: window.truncated ? window.items[0]?.seq : current?.windowStartSeq,
            status: subscription.snapshot.status,
          }
        })
        queryClient.setQueryData(queryKeys.sessionQueue(sessionId), subscription.snapshot.queue)
        queryClient.setQueryData(queryKeys.sessionJobs(sessionId), subscription.snapshot.jobs)
        queryClient.setQueryData(queryKeys.sessionInteractions(sessionId), {
          items: subscription.snapshot.interactions,
        })
        await api.activateSessionSubscription(
          subscription.subscriptionId,
          subscription.activationToken,
          subscription.snapshotSeq,
        )
        if (!valid()) return
        subscribed.add(sessionId)
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(sessionId) })
      } catch {
        // An incomplete snapshot/activation must be retried through a new stream, never marked subscribed.
        if (valid()) reconnect()
      } finally {
        pending.delete(sessionId)
      }
    }
    setStatus('connecting')
    armWatchdog(HANDSHAKE_TIMEOUT)
    void consumeEventStream(
      options.fetchStream,
      `${connection.gatewayUrl}/v1/events`,
      mobileAuthorization(connection),
      controller.signal,
      (event) => {
        if (!valid() || seen.has(event.eventId)) return
        seen.add(event.eventId)
        if (seen.size > 512) seen.delete(seen.values().next().value!)
        options.markEvent()
        if (event.type === 'gateway/ready') {
          ready = true
          attempt = 0
          setStatus('connected')
          armWatchdog(IDLE_TIMEOUT)
          void api
            .runningSessions()
            .then((snapshot) => {
              if (valid()) for (const id of snapshot.sessionIds) void hydrate(id)
            })
            .catch(() => {
              if (valid()) reconnect()
            })
        }
        if (event.type === 'host/session-status' && event.sessionId && event.payload.running === true)
          void hydrate(event.sessionId)
        applyMobileStreamEvent(queryClient, event)
      },
      () => {
        if (ready && valid()) armWatchdog(IDLE_TIMEOUT)
      },
    )
      .then(() => {
        if (valid()) reconnect()
      })
      .catch((error) => {
        if (!valid()) return
        if (requiresRePair(error)) {
          stopped = true
          controller.abort()
          setStatus('disconnected')
          options.onUnauthorized()
        } else reconnect()
      })
      .finally(() => clearTimeout(watchdog))
  }
  open()
  return () => {
    stopped = true
    if (retry !== undefined) clearTimeout(retry)
    active?.abort()
    setStatus('disconnected')
  }
}

function mergeItems(existing: SessionEventItem[], incoming: SessionEventItem[]): SessionEventItem[] {
  const items = new Map<number | SessionEventItem, SessionEventItem>()
  for (const item of [...existing, ...incoming]) items.set(item.seq ?? item, item)
  return [...items.values()].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
}
