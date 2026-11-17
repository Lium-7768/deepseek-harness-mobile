import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import type { FlatList } from 'react-native'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useReadingPositionStore } from '@/state/reading-positions'

import {
  isNearLatestMessage,
  READER_SCROLL_TAIL_MS,
  restoredOffsetOnOpen,
  RESTORE_WAIT_MS,
  shouldLoadOlderHistory,
  shouldReleaseFollowOnScroll,
  shouldShowReturnToLatest,
  OLDER_HISTORY_REARM_PX,
  OLDER_HISTORY_TRIGGER_PX,
  SEND_FOLLOW_WINDOW_MS,
} from '@/components/session-scroll-logic'

/**
 * Everything a scrollable conversation keeps about its own viewport.
 *
 * A transcript has one viewport and one set of questions about it: is the reader at the
 * newest message, may a measurement move that answer, where were they before they left,
 * and is there older history within reach. Keeping those together means a component that
 * renders rows does not also own the state that decides when to fetch more of them.
 */

/** What a list measurement reports, in the list's own frame. */
interface ScrollMetrics {
  contentHeight: number
  offsetY: number
  viewportHeight: number
  /** The same position in upright terms, which is what the runway rules are stated in. */
  uprightOffset: number
}

/** A remembered reading position, as the store keeps it. */
interface RestoreTarget {
  contentHeight: number
  offsetY: number
  rows: number
}

export interface ConversationViewport<Row> {
  /** Attach to the list. */
  listRef: React.RefObject<FlatList<Row> | null>
  /** Whether the return-to-latest control should be shown. */
  showReturnToLatest: boolean
  /** Messages that arrived since the reader left the newest one. */
  unseenCount: number
  /** Jump to the newest message, or only record that the reader is looking at it. */
  pinToLatest: (options?: { scroll?: boolean }) => void
  /** Begin a reader gesture: hold the sticky answer until the gesture settles. */
  beginReaderScroll: () => void
  /** Settle a reader gesture, after its momentum tail. */
  settleReaderScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  /** Feed one measurement from the list. */
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  /** Whether the reader has left the newest message. */
  isAwayFromLatest: () => boolean
  /** Record that the reader picked a row away from the newest message. */
  noteReaderLeftLatest: () => void
  /** Tell the viewport the reader's own send is landing, so growth is followed briefly. */
  noteSend: () => void
  /** Reset for a different conversation. */
  resetForSession: (sessionId: string | undefined, messageCount: number) => void
  /** Answer a content measurement, applying a remembered offset when one is pending. */
  handleContentSizeChange: (height: number) => void
  /** Whether the reader has come close enough to the oldest loaded row to ask for more. */
  isAtHistoryRunway: () => boolean
  /** Re-arm the runway after a page lands, so one gesture cannot request twice. */
  noteOlderPageLoaded: () => void
}

/**
 * Convert an inverted-list measurement to the offset an upright list would report.
 *
 * `inverted` measures from the newest row, while every rule about distance from the
 * bottom and distance from the start is stated in upright terms.
 *
 * @param metrics - One scroll measurement from the inverted list.
 * @returns The equivalent offset in an upright list.
 */
export function uprightOffset(metrics: {
  contentOffset: { y: number }
  contentSize: { height: number }
  layoutMeasurement: { height: number }
}): number {
  return Math.max(0, metrics.contentSize.height - metrics.layoutMeasurement.height - metrics.contentOffset.y)
}

/**
 * Own the conversation viewport.
 *
 * @param options.sessionId - The conversation being read, or undefined before one is open.
 * @param options.messageCount - Rows on screen, used for the unseen count and restore.
 * @returns The viewport handle the list and the return control bind to.
 */
export function useConversationViewport<Row>({
  sessionId,
  messageCount,
}: {
  sessionId: string | undefined
  messageCount: number
}): ConversationViewport<Row> {
  const listRef = useRef<FlatList<Row> | null>(null)
  const nearLatest = useRef(true)
  const readerScrolling = useRef(false)
  const readerIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendFollowUntil = useRef(0)
  const unseenBaseline = useRef<number | undefined>(undefined)
  const metrics = useRef<ScrollMetrics>({ contentHeight: 0, offsetY: 0, uprightOffset: 0, viewportHeight: 0 })
  const pendingRestore = useRef<RestoreTarget | null>(null)
  /** Closed after a page lands; opened once the reader scrolls back out of the runway. */
  const awaitingOlderRearm = useRef(false)
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showReturnToLatest, setShowReturnToLatest] = useState(false)
  const [unseenCount, setUnseenCount] = useState(0)
  const rememberPosition = useReadingPositionStore((state) => state.remember)
  const forgetPosition = useReadingPositionStore((state) => state.forget)

  const pinToLatest = useCallback(
    ({ scroll = false }: { scroll?: boolean } = {}): void => {
      nearLatest.current = true
      setShowReturnToLatest(false)
      unseenBaseline.current = undefined
      setUnseenCount(0)
      pendingRestore.current = null
      if (sessionId !== undefined) forgetPosition(sessionId)
      // An inverted list rests on its newest row, so only a deliberate return moves it.
      if (scroll) listRef.current?.scrollToOffset({ animated: true, offset: 0 })
    },
    [forgetPosition, sessionId],
  )

  const applyProximity = useCallback(
    (event: NativeScrollEvent, releaseLatch: boolean): void => {
      // A measurement taken while the reader's own send is still landing trails the new
      // content, so releasing the answer there would strand the reply above the viewport.
      if (
        shouldReleaseFollowOnScroll({
          readerScrolling: releaseLatch,
          sendFollowWindowOpen: Date.now() < sendFollowUntil.current,
        })
      )
        nearLatest.current = isNearLatestMessage(
          event.contentSize.height,
          event.layoutMeasurement.height,
          uprightOffset(event),
        )
      // The control mirrors the answer, not this measurement: content that grows under a
      // programmatic move must not advertise a return that lands nowhere.
      setShowReturnToLatest(shouldShowReturnToLatest({ hasMessages: messageCount > 0, nearLatest: nearLatest.current }))
      if (nearLatest.current) {
        unseenBaseline.current = undefined
        setUnseenCount(0)
      } else if (unseenBaseline.current === undefined) {
        // The baseline is the row count when the reader left, so the badge counts what
        // arrived since rather than the size of the whole transcript.
        unseenBaseline.current = messageCount
      }
    },
    [messageCount],
  )

  const beginReaderScroll = useCallback((): void => {
    if (readerIdleTimer.current) clearTimeout(readerIdleTimer.current)
    readerIdleTimer.current = null
    readerScrolling.current = true
  }, [])

  const settleReaderScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      applyProximity(event.nativeEvent, true)
      if (readerIdleTimer.current) clearTimeout(readerIdleTimer.current)
      readerIdleTimer.current = setTimeout(() => {
        readerScrolling.current = false
        readerIdleTimer.current = null
        if (sessionId === undefined) return
        if (nearLatest.current) forgetPosition(sessionId)
        else {
          const settled = metrics.current
          rememberPosition(sessionId, {
            contentHeight: settled.contentHeight,
            offsetY: settled.offsetY,
            rows: messageCount,
          })
        }
      }, READER_SCROLL_TAIL_MS)
    },
    [applyProximity, forgetPosition, messageCount, rememberPosition, sessionId],
  )

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      metrics.current = {
        contentHeight: event.nativeEvent.contentSize.height,
        offsetY: event.nativeEvent.contentOffset.y,
        uprightOffset: uprightOffset(event.nativeEvent),
        viewportHeight: event.nativeEvent.layoutMeasurement.height,
      }
      applyProximity(event.nativeEvent, readerScrolling.current)
    },
    [applyProximity],
  )

  const isAwayFromLatest = useCallback((): boolean => !nearLatest.current, [])

  const isAtHistoryRunway = useCallback((): boolean => {
    const offset = metrics.current.uprightOffset
    // Leaving the runway re-opens it, so the next approach is a new request rather than
    // the echo of the one just answered.
    if (awaitingOlderRearm.current) {
      if (offset > OLDER_HISTORY_TRIGGER_PX + OLDER_HISTORY_REARM_PX) awaitingOlderRearm.current = false
      else return false
    }
    return shouldLoadOlderHistory({
      offsetY: offset,
      hasMore: true,
      loading: false,
      exhausted: false,
      awaitingRearm: awaitingOlderRearm.current,
    })
  }, [])

  const noteOlderPageLoaded = useCallback((): void => {
    awaitingOlderRearm.current = true
  }, [])

  const noteReaderLeftLatest = useCallback((): void => {
    nearLatest.current = false
  }, [])

  const noteSend = useCallback((): void => {
    sendFollowUntil.current = Date.now() + SEND_FOLLOW_WINDOW_MS
    pinToLatest()
  }, [pinToLatest])

  const resetForSession = useCallback(
    (nextSessionId: string | undefined, count: number): void => {
      nearLatest.current = true
      setShowReturnToLatest(false)
      unseenBaseline.current = undefined
      setUnseenCount(0)
      // A conversation left mid-read reopens where it was left. The remembered offset only
      // applies once the transcript reports a height it can still address, so it waits.
      const saved =
        nextSessionId === undefined ? undefined : useReadingPositionStore.getState().positions[nextSessionId]
      pendingRestore.current = saved ?? null
      if (restoreTimer.current) clearTimeout(restoreTimer.current)
      restoreTimer.current = null
      if (saved === undefined) return
      nearLatest.current = false
      setShowReturnToLatest(true)
      unseenBaseline.current = saved.rows
      restoreTimer.current = setTimeout(() => {
        restoreTimer.current = null
        if (pendingRestore.current === null) return
        pendingRestore.current = null
        pinToLatest({ scroll: true })
      }, RESTORE_WAIT_MS)
      void count
    },
    [pinToLatest],
  )

  const handleContentSizeChange = useCallback((height: number): void => {
    const restore = pendingRestore.current
    if (restore === null) return
    const offset = restoredOffsetOnOpen({ saved: restore, contentHeight: height })
    if (offset === undefined) return
    pendingRestore.current = null
    if (restoreTimer.current) clearTimeout(restoreTimer.current)
    restoreTimer.current = null
    listRef.current?.scrollToOffset({ animated: false, offset })
  }, [])

  useEffect(
    () => () => {
      if (readerIdleTimer.current) clearTimeout(readerIdleTimer.current)
      if (restoreTimer.current) clearTimeout(restoreTimer.current)
    },
    [],
  )

  return {
    listRef,
    showReturnToLatest,
    unseenCount,
    pinToLatest,
    beginReaderScroll,
    settleReaderScroll,
    handleScroll,
    isAwayFromLatest,
    isAtHistoryRunway,
    noteOlderPageLoaded,
    noteReaderLeftLatest,
    noteSend,
    resetForSession,
    handleContentSizeChange,
  }
}
