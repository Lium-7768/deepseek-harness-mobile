import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { sessionEventsOptions, sessionPreviewOptions } from '@/api/session-query-options'
import type { SessionEventItem, SessionEventsPayload } from '@/types/mobile'

function api() {
  const client = { withSignal: vi.fn(), sessionEvents: vi.fn(), sessionHistory: vi.fn() }
  client.withSignal.mockReturnValue(client)
  return { client, typed: client as unknown as MobileApi }
}

describe('shared session query contracts', () => {
  it('uses the cached cursor for either mounted observer and merges SSE arriving during a read', async () => {
    const cache = new QueryClient()
    const { client, typed } = api()
    const key = queryKeys.sessionEvents('one')
    cache.setQueryData(key, { since: 10, items: [], status: 'idle', windowStartSeq: 4 })
    let finish!: (page: SessionEventsPayload) => void
    client.sessionEvents.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const workspace = new QueryObserver(cache, sessionEventsOptions(cache, typed, 'one'))
    const session = new QueryObserver(cache, sessionEventsOptions(cache, typed, 'one'))
    const unsubscribe = [workspace.subscribe(() => undefined), session.subscribe(() => undefined)]
    try {
      const read = workspace.refetch()
      expect(client.sessionEvents).toHaveBeenCalledWith('one', 10)
      cache.setQueryData(key, {
        since: 12,
        status: 'running',
        windowStartSeq: 4,
        items: [{ seq: 12, event: { type: 'assistant/chunk', data: { turn: 1, step: 1 } } }],
      })
      finish({
        since: 15,
        status: 'idle',
        items: [{ seq: 13, event: { type: 'assistant/message', data: { turn: 1, step: 1 } } }],
      })
      await read
      expect(cache.getQueryData<SessionEventsPayload>(key)).toMatchObject({
        since: 15,
        windowStartSeq: 4,
        items: [{ seq: 13 }],
      })
      client.sessionEvents.mockResolvedValueOnce({ since: 15, items: [], status: 'idle' })
      await session.refetch()
      expect(client.sessionEvents).toHaveBeenLastCalledWith('one', 15)
      expect(client.withSignal).toHaveBeenCalledWith(expect.any(AbortSignal))
      expect(cache.getQueryData<SessionEventsPayload>(key)?.windowStartSeq).toBe(4)
    } finally {
      unsubscribe.forEach((stop) => stop())
      cache.clear()
    }
  })

  it('bounds full event responses by complete turns and retains the history cursor on later reads', async () => {
    const cache = new QueryClient()
    const { client, typed } = api()
    const items: SessionEventItem[] = Array.from({ length: 1100 }, (_, turn) => [
      { seq: turn * 3 + 1, event: { type: 'turn/start' } },
      { seq: turn * 3 + 2, event: { type: 'user/message' } },
      { seq: turn * 3 + 3, event: { type: 'turn/end' } },
    ]).flat()
    client.sessionEvents.mockResolvedValueOnce({ since: 3300, status: 'idle', items })
    const first = await cache.fetchQuery(sessionEventsOptions(cache, typed, 'one'))
    expect(first.items.length).toBeLessThanOrEqual(2000)
    expect(first.windowStartSeq).toBe(first.items[0].seq)
    await cache.invalidateQueries({ queryKey: queryKeys.sessionEvents('one') })
    client.sessionEvents.mockResolvedValueOnce({ since: 3301, status: 'idle', items: [] })
    const next = await cache.fetchQuery(sessionEventsOptions(cache, typed, 'one'))
    expect(client.sessionEvents).toHaveBeenLastCalledWith('one', 3300)
    expect(next.windowStartSeq).toBe(first.windowStartSeq)
    cache.clear()
  })

  it('fetches a one-message preview under a separate key while retaining prefix invalidation', async () => {
    const cache = new QueryClient()
    const { client, typed } = api()
    const fullKey = queryKeys.sessionHistory('one')
    cache.setQueryData(fullKey, { items: [{ seq: 1 }, { seq: 2 }] })
    client.sessionHistory.mockResolvedValue({ items: [{ seq: 2 }], projections: { asOfSeq: 2, values: {} } })
    const options = sessionPreviewOptions(typed, 'one')
    expect(options.queryKey).not.toEqual(fullKey)
    await cache.fetchQuery(options)
    expect(client.sessionHistory).toHaveBeenCalledWith('one', { maxMessages: 1 })
    expect(cache.getQueryData(fullKey)).toEqual({ items: [{ seq: 1 }, { seq: 2 }] })
    await cache.invalidateQueries({ queryKey: fullKey })
    expect(cache.getQueryState(fullKey)?.isInvalidated).toBe(true)
    expect(cache.getQueryState(options.queryKey)?.isInvalidated).toBe(true)
    expect(sessionPreviewOptions(undefined, 'one').enabled).toBe(false)
    expect(sessionEventsOptions(cache, typed, undefined).enabled).toBe(false)
    cache.clear()
  })
})
