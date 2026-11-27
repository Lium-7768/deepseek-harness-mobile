import { createElement } from 'react'
import { act, cleanup, render } from './support/native-testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useConversationViewport, type ConversationViewport } from '@/features/session/use-conversation-viewport'
import { useReadingPositionStore } from '@/state/reading-positions'

describe('useConversationViewport session resets', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useReadingPositionStore.getState().clear()
  })
  afterEach(async () => {
    await cleanup()
    useReadingPositionStore.getState().clear()
    vi.useRealTimers()
  })

  it('clears pending scroll timers, stale metrics, and older-history rearm latch on session switch', async () => {
    let viewport!: ConversationViewport<string>
    function Harness({ sessionId, messageCount }: { sessionId: string; messageCount: number }) {
      viewport = useConversationViewport<string>({ sessionId, messageCount })
      return null
    }

    const rendered = await render(createElement(Harness, { sessionId: 'a', messageCount: 20 }))
    const scrollEvent = (offsetY: number) =>
      ({
        nativeEvent: {
          contentOffset: { x: 0, y: offsetY },
          contentSize: { width: 390, height: 2000 },
          layoutMeasurement: { width: 390, height: 800 },
        },
      }) as never

    // User drags to the top of session A and loads one older page, latching awaitingOlderRearm.
    await act(async () => {
      viewport.beginReaderScroll()
      viewport.handleScroll(scrollEvent(1150))
      viewport.noteOlderPageLoaded()
      viewport.settleReaderScroll(scrollEvent(1150))
    })
    expect(viewport.isAtHistoryRunway({ hasMore: true, loading: false, exhausted: false })).toBe(false)

    // Switching to session B before the idle timer fires cancels remembering session A and resets metrics/rearm.
    await act(async () => {
      await rendered.rerender(createElement(Harness, { sessionId: 'b', messageCount: 20 }))
      viewport.resetForSession('b')
      vi.advanceTimersByTime(1_000)
    })
    expect(useReadingPositionStore.getState().positions['a']).toBeUndefined()
    // Metrics were reset to 0, so stale session A metrics cannot fire a runway fetch for session B.
    expect(viewport.isAtHistoryRunway({ hasMore: true, loading: false, exhausted: false })).toBe(false)

    // Once session B scrolls into its own top runway, awaitingOlderRearm is open so loading works immediately.
    await act(async () => {
      viewport.beginReaderScroll()
      viewport.handleScroll(scrollEvent(1150))
    })
    expect(viewport.isAtHistoryRunway({ hasMore: true, loading: false, exhausted: false })).toBe(true)
  })
})
