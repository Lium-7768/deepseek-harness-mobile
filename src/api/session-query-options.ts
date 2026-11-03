import type { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { t as message } from '@/locale'
import { mergeEventItems } from '@/sync/event-items'
import { sessionWindow } from '@/sync/session-window'
import type { SessionEventsPayload } from '@/types/mobile'
import { queryOptions, type QueryClient } from '@tanstack/react-query'

/** Every observer of this key must use the same incremental, bounded event loader. */
export function sessionEventsOptions(cache: QueryClient, client: MobileApi | undefined, sessionId: string | undefined) {
  const queryKey = queryKeys.sessionEvents(sessionId)
  return queryOptions({
    queryKey,
    staleTime: Infinity,
    enabled: Boolean(client && sessionId),
    queryFn: async ({ signal }): Promise<SessionEventsPayload> => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      const cursor = cache.getQueryData<SessionEventsPayload>(queryKey)?.since ?? 0
      const page = await client.withSignal(signal).sessionEvents(sessionId, cursor)
      // SSE may append while this read is in flight; always merge into the latest tail.
      const latest = cache.getQueryData<SessionEventsPayload>(queryKey)
      const window = sessionWindow(mergeEventItems(latest?.items ?? [], page.items))
      return {
        ...page,
        since: page.items.reduce(
          (maximum, item) => Math.max(maximum, item.seq ?? 0),
          Math.max(cursor, latest?.since ?? 0, page.since),
        ),
        items: window.items,
        windowStartSeq: window.truncated ? window.items[0]?.seq : latest?.windowStartSeq,
      }
    },
  })
}

/** A small history tail includes the host projections without populating the full transcript key. */
export function sessionPreviewOptions(client: MobileApi | undefined, sessionId: string | undefined) {
  return queryOptions({
    queryKey: queryKeys.sessionHistoryTail(sessionId, 1),
    enabled: Boolean(client && sessionId),
    queryFn: ({ signal }) => {
      if (!client || !sessionId) throw new Error(message('conversation.openFromList'))
      return client.withSignal(signal).sessionHistory(sessionId, { maxMessages: 1 })
    },
  })
}
