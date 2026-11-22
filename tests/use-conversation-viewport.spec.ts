import { createElement } from 'react'
import { act, cleanup, render } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

vi.mock('react-native', () => ({}))
vi.mock('@/state/reading-positions', () => {
  const state = {
    positions: {} as Record<string, { contentHeight: number; offsetY: number; rows: number }>,
    remember: vi.fn(),
    forget: vi.fn(),
  }
  return {
    useReadingPositionStore: Object.assign((selector: (value: typeof state) => unknown) => selector(state), {
      getState: () => state,
    }),
  }
})

import { useConversationViewport, type ConversationViewport } from '@/features/session/use-conversation-viewport'

afterEach(cleanup)

function scrollEvent(
  offsetY: number,
  contentHeight = 1200,
  viewportHeight = 600,
): NativeSyntheticEvent<NativeScrollEvent> {
  return {
    nativeEvent: {
      contentOffset: { x: 0, y: offsetY },
      contentSize: { width: 400, height: contentHeight },
      layoutMeasurement: { width: 400, height: viewportHeight },
    },
  } as NativeSyntheticEvent<NativeScrollEvent>
}

describe('useConversationViewport flicker & jump guards', () => {
  it('keeps scroll callbacks stable across messageCount growth and ignores programmatic momentum', async () => {
    let latest!: ConversationViewport<unknown>
    function Harness({ messageCount, sessionId }: { messageCount: number; sessionId: string }) {
      latest = useConversationViewport({ sessionId, messageCount })
      return createElement('View')
    }

    const renderer = await render(createElement(Harness, { sessionId: 's1', messageCount: 2 }))
    const initialHandleScroll = latest.handleScroll
    const initialSettle = latest.settleReaderScroll

    await act(async () => {
      await renderer.rerender(createElement(Harness, { sessionId: 's1', messageCount: 5 }))
    })
    expect(latest.handleScroll).toBe(initialHandleScroll)
    expect(latest.settleReaderScroll).toBe(initialSettle)

    // Programmatic momentum without a prior drag must not release the follow latch.
    await act(async () => {
      latest.beginMomentumScroll()
      latest.handleScroll(scrollEvent(400))
      latest.settleMomentumScroll(scrollEvent(400))
    })
    expect(latest.isAwayFromLatest()).toBe(false)

    // A real reader drag followed by momentum does release the latch when scrolled up.
    await act(async () => {
      latest.beginReaderScroll()
      latest.handleScroll(scrollEvent(400))
      latest.settleMomentumScroll(scrollEvent(400))
    })
    expect(latest.isAwayFromLatest()).toBe(true)
  })

  it('does not auto-trigger older history when resting at offset 0 on a short transcript', async () => {
    let latest!: ConversationViewport<unknown>
    function Harness() {
      latest = useConversationViewport({ sessionId: 's1', messageCount: 2 })
      return createElement('View')
    }
    await render(createElement(Harness))

    await act(async () => {
      latest.handleScroll(scrollEvent(0, 400, 600))
    })
    expect(latest.isAtHistoryRunway({ hasMore: true, loading: false, exhausted: false })).toBe(false)
  })
})
