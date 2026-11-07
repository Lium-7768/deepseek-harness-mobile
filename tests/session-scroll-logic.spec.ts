import { describe, expect, it } from 'vitest'
import {
  isNearLatestMessage,
  restoredOffsetAfterPrepend,
  restoredOffsetOnOpen,
  shouldFollowContentGrowth,
  shouldLoadOlderHistory,
  shouldRefreshFromPull,
  shouldCaptureUnreadBaseline,
  unreadCountLabel,
  shouldReleaseFollowOnScroll,
  shouldScrollToLatest,
  shouldShowReturnToLatest,
  shouldTrackLatestProximity,
} from '../src/components/session-scroll-logic.ts'

describe('session latest-message scroll policy', () => {
  it('positions an opened conversation at the newest message before the first scroll measurement', () => {
    expect(shouldScrollToLatest({ hasMessages: true, initialPositionPending: true, nearLatest: false })).toBe(true)
  })

  it('follows late content while the reader remains near the newest message', () => {
    expect(isNearLatestMessage(1_000, 400, 540)).toBe(true)
    expect(shouldScrollToLatest({ hasMessages: true, initialPositionPending: false, nearLatest: true })).toBe(true)
  })

  it('ignores pre-layout scroll measurements until initial latest positioning completes', () => {
    expect(shouldTrackLatestProximity({ initialPositionPending: true })).toBe(false)
    expect(shouldTrackLatestProximity({ initialPositionPending: false })).toBe(true)
  })

  it('does not interrupt deliberate history reading away from the newest message', () => {
    expect(isNearLatestMessage(1_000, 400, 300)).toBe(false)
    expect(shouldScrollToLatest({ hasMessages: true, initialPositionPending: false, nearLatest: false })).toBe(false)
  })

  it('shows a manual return control only while a reader is away from the newest message', () => {
    expect(shouldShowReturnToLatest({ hasMessages: true, nearLatest: false })).toBe(true)
    expect(shouldShowReturnToLatest({ hasMessages: true, nearLatest: true })).toBe(false)
    expect(shouldShowReturnToLatest({ hasMessages: false, nearLatest: false })).toBe(false)
  })

  it('does not request a scroll for an empty conversation', () => {
    expect(shouldScrollToLatest({ hasMessages: false, initialPositionPending: true, nearLatest: true })).toBe(false)
  })
})

describe('content-growth follow policy', () => {
  it('follows growth once per content change while the reader stays at the bottom', () => {
    // A long conversation mounts rows past the first jump; each growth must re-pin.
    expect(shouldFollowContentGrowth({ hasMessages: true, sticksToLatest: true, sendFollowWindowOpen: false })).toBe(
      true,
    )
    expect(shouldFollowContentGrowth({ hasMessages: true, sticksToLatest: true, sendFollowWindowOpen: false })).toBe(
      true,
    )
  })

  it('stops following once the reader drags away from the bottom', () => {
    expect(shouldFollowContentGrowth({ hasMessages: true, sticksToLatest: false, sendFollowWindowOpen: false })).toBe(
      false,
    )
  })

  it('keeps following inside the send window even when a stale measurement reads as away', () => {
    // The prompt row and the first reply chunk land in separate commits.
    expect(shouldFollowContentGrowth({ hasMessages: true, sticksToLatest: false, sendFollowWindowOpen: true })).toBe(
      true,
    )
  })

  it('does not follow an empty conversation', () => {
    expect(shouldFollowContentGrowth({ hasMessages: false, sticksToLatest: true, sendFollowWindowOpen: true })).toBe(
      false,
    )
  })

  it('only lets the reader release the latch, never a programmatic jump', () => {
    expect(shouldReleaseFollowOnScroll({ readerScrolling: true, sendFollowWindowOpen: false })).toBe(true)
    expect(shouldReleaseFollowOnScroll({ readerScrolling: false, sendFollowWindowOpen: false })).toBe(false)
  })

  it('protects the latch for the whole send window even while the reader drags', () => {
    expect(shouldReleaseFollowOnScroll({ readerScrolling: true, sendFollowWindowOpen: true })).toBe(false)
  })
})

describe('history prepend anchor', () => {
  it('keeps the reader on the same row when older rows land above the viewport', () => {
    // 400pt of history arrives above; the offset must grow by exactly that much.
    expect(
      restoredOffsetAfterPrepend({ previousContentHeight: 2_000, previousOffset: 900, nextContentHeight: 2_400 }),
    ).toBe(1_300)
  })

  it('leaves the offset alone when the prepend adds nothing', () => {
    expect(
      restoredOffsetAfterPrepend({ previousContentHeight: 2_000, previousOffset: 900, nextContentHeight: 2_000 }),
    ).toBe(900)
  })

  it('never returns a negative offset', () => {
    expect(
      restoredOffsetAfterPrepend({ previousContentHeight: 2_000, previousOffset: 0, nextContentHeight: 1_500 }),
    ).toBe(0)
    expect(
      restoredOffsetAfterPrepend({ previousContentHeight: Number.NaN, previousOffset: 0, nextContentHeight: 1_500 }),
    ).toBe(0)
  })
})

describe('older-history auto load', () => {
  it('requests the next page before the reader reaches the first row', () => {
    expect(shouldLoadOlderHistory({ offsetY: 200, hasMore: true, loading: false, exhausted: false })).toBe(true)
    expect(shouldLoadOlderHistory({ offsetY: 0, hasMore: true, loading: false, exhausted: false })).toBe(true)
  })

  it('does not request while the reader is still reading the middle', () => {
    expect(shouldLoadOlderHistory({ offsetY: 900, hasMore: true, loading: false, exhausted: false })).toBe(false)
  })

  it('does not stack requests while one is in flight', () => {
    expect(shouldLoadOlderHistory({ offsetY: 10, hasMore: true, loading: true, exhausted: false })).toBe(false)
  })

  it('stops once the host reports no more pages', () => {
    expect(shouldLoadOlderHistory({ offsetY: 10, hasMore: false, loading: false, exhausted: false })).toBe(false)
  })

  it('stops after a page that brought no rows, even if the host still claims more', () => {
    expect(shouldLoadOlderHistory({ offsetY: 10, hasMore: true, loading: false, exhausted: true })).toBe(false)
  })

  it('ignores a measurement that is not a finite number', () => {
    expect(shouldLoadOlderHistory({ offsetY: Number.NaN, hasMore: true, loading: false, exhausted: false })).toBe(false)
  })
})

describe('pull to refresh', () => {
  it('refetches when the list is settled', () => {
    expect(shouldRefreshFromPull({ refreshing: false, loadingOlder: false })).toBe(true)
  })

  it('does not stack a second refetch while one is running', () => {
    expect(shouldRefreshFromPull({ refreshing: true, loadingOlder: false })).toBe(false)
  })

  it('yields to an older page already in flight', () => {
    // Both would change the same list, and the prepend anchor would restore an offset
    // computed against a list that moved for two reasons.
    expect(shouldRefreshFromPull({ refreshing: false, loadingOlder: true })).toBe(false)
  })
})

describe('unread badge', () => {
  it('prints nothing when every row was already read', () => {
    expect(unreadCountLabel(0)).toBeUndefined()
    expect(unreadCountLabel(-1)).toBeUndefined()
  })

  it('counts the rows that arrived since the reader left the bottom', () => {
    expect(unreadCountLabel(1)).toBe('1')
    expect(unreadCountLabel(12)).toBe('12')
  })

  it('collapses a large count instead of widening the control', () => {
    expect(unreadCountLabel(99)).toBe('99')
    expect(unreadCountLabel(100)).toBe('99+')
  })

  it('captures a baseline only after the reader actually leaves the bottom', () => {
    expect(shouldCaptureUnreadBaseline({ nearLatest: false, returning: false })).toBe(true)
    expect(shouldCaptureUnreadBaseline({ nearLatest: true, returning: false })).toBe(false)
    expect(shouldCaptureUnreadBaseline({ nearLatest: false, returning: true })).toBe(false)
  })

  it('reopens a conversation at the offset it was left at', () => {
    const saved = { contentHeight: 4000, offsetY: 1200 }
    expect(restoredOffsetOnOpen({ saved, contentHeight: 4000 })).toBe(1200)
    // Newer rows grew the tail; the offset still names the same message.
    expect(restoredOffsetOnOpen({ saved, contentHeight: 5200 })).toBe(1200)
  })

  it('falls back to the newest message when the transcript came back shorter', () => {
    expect(restoredOffsetOnOpen({ saved: { contentHeight: 4000, offsetY: 1200 }, contentHeight: 2000 })).toBeUndefined()
    expect(restoredOffsetOnOpen({ saved: { contentHeight: 4000, offsetY: 0 }, contentHeight: 4000 })).toBeUndefined()
    expect(restoredOffsetOnOpen({ saved: { contentHeight: 0, offsetY: 0 }, contentHeight: 0 })).toBeUndefined()
  })

  it('clamps an offset that would land past the measured content', () => {
    expect(restoredOffsetOnOpen({ saved: { contentHeight: 4000, offsetY: 3900 }, contentHeight: 4000 })).toBe(3900)
    expect(restoredOffsetOnOpen({ saved: { contentHeight: 4000, offsetY: 4000 }, contentHeight: 4000 })).toBe(4000)
  })
})
