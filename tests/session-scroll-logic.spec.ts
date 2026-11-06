import { describe, expect, it } from 'vitest'
import {
  isNearLatestMessage,
  shouldFollowContentGrowth,
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
