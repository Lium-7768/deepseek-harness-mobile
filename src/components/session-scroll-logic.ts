/** Pixel distance from the message list end that still counts as reading the latest conversation. */
export const LATEST_MESSAGE_PROXIMITY_PX = 72

/**
 * Time after a touch-driven scroll that still counts as the reader controlling the list, so the
 * momentum tail of one gesture is not mistaken for programmatic movement.
 */
export const READER_SCROLL_TAIL_MS = 350

/**
 * Time after pinning the list to the newest message that lazily measured rows are allowed to
 * settle, so the follow-up jump targets the final content length.
 */
export const LATEST_PIN_SETTLE_MS = 250

/**
 * Time after the reader's own send that content growth keeps following the newest message even
 * if a measurement briefly reads as away-from-bottom.
 *
 * The prompt row and the first assistant chunk land in separate commits, so the list can measure
 * a stale offset between them. Without this window the reply opens above the viewport, which is
 * the "I have to scroll down after every send" failure.
 */
export const SEND_FOLLOW_WINDOW_MS = 1_500

/**
 * Decides whether content growth should move the list to the newest message.
 *
 * Unlike `shouldScrollToLatest`, this is asked once per content change, not once per open: a long
 * conversation mounts lazily beyond the first pin, so the list has to keep following while the
 * reader stays at the bottom.
 *
 * @param args - Whether any message exists, whether the reader is at the bottom, and whether the
 *   reader's own send opened a follow window.
 * @returns True when the list should jump to the end.
 */
export function shouldFollowContentGrowth({
  hasMessages,
  sticksToLatest,
  sendFollowWindowOpen,
}: {
  hasMessages: boolean
  sticksToLatest: boolean
  sendFollowWindowOpen: boolean
}): boolean {
  return hasMessages && (sticksToLatest || sendFollowWindowOpen)
}

/**
 * Decides whether a reader's scroll measurement may release the follow latch.
 *
 * A programmatic jump towards growing content measures an offset that trails the new content, so
 * only a measurement taken while the reader is actually dragging may move the latch.
 */
export function shouldReleaseFollowOnScroll({
  readerScrolling,
  sendFollowWindowOpen,
}: {
  readerScrolling: boolean
  sendFollowWindowOpen: boolean
}): boolean {
  return readerScrolling && !sendFollowWindowOpen
}

/**
 * Computes the offset that keeps a reader on the same row after history is prepended.
 *
 * Newer rows above the viewport grow the content height without moving what the reader is
 * looking at, so the offset has to grow by exactly that much. Anchoring the offset this way
 * replaces `maintainVisibleContentPosition`, whose latch also fights a jump to the newest
 * message at the bottom of the same list.
 *
 * @param args - The content height and offset before the prepend, and the height after it.
 * @returns The offset to restore, never below zero.
 */
export function restoredOffsetAfterPrepend({
  previousContentHeight,
  previousOffset,
  nextContentHeight,
}: {
  previousContentHeight: number
  previousOffset: number
  nextContentHeight: number
}): number {
  if (![previousContentHeight, previousOffset, nextContentHeight].every(Number.isFinite)) return 0
  return Math.max(0, previousOffset + Math.max(0, nextContentHeight - previousContentHeight))
}

/**
 * Distance from the top of the list that counts as reaching for older history.
 *
 * One screen of runway: the request starts before the reader hits the first row, so the
 * older messages are usually there by the time the top is visible.
 */
export const OLDER_HISTORY_TRIGGER_PX = 320

/**
 * Decides whether a scroll measurement should request the next older page.
 *
 * @param args - The current offset, whether more pages exist, whether a request is already
 *   in flight, and whether an earlier request settled without adding rows.
 * @returns True when one more page should be requested.
 */
export function shouldLoadOlderHistory({
  offsetY,
  hasMore,
  loading,
  exhausted,
}: {
  offsetY: number
  hasMore: boolean
  loading: boolean
  exhausted: boolean
}): boolean {
  if (!Number.isFinite(offsetY)) return false
  if (loading || exhausted || !hasMore) return false
  return offsetY <= OLDER_HISTORY_TRIGGER_PX
}

/** Reports whether a list viewport is at or close enough to the newest visible message. */
export function isNearLatestMessage(
  contentHeight: number,
  viewportHeight: number,
  offsetY: number,
  proximityPx = LATEST_MESSAGE_PROXIMITY_PX,
): boolean {
  if (![contentHeight, viewportHeight, offsetY, proximityPx].every(Number.isFinite)) return false
  return contentHeight - viewportHeight - Math.max(0, offsetY) <= Math.max(0, proximityPx)
}

/** Decides whether the native conversation should expose a manual return-to-latest control. */
export function shouldShowReturnToLatest({
  hasMessages,
  nearLatest,
}: {
  hasMessages: boolean
  nearLatest: boolean
}): boolean {
  return hasMessages && !nearLatest
}

/** Decides whether a list measurement belongs to deliberate reader scrolling rather than initial positioning. */
export function shouldTrackLatestProximity({ initialPositionPending }: { initialPositionPending: boolean }): boolean {
  return !initialPositionPending
}

/** Decides whether the native list may move to the latest message without overriding deliberate history reading. */
export function shouldScrollToLatest({
  hasMessages,
  initialPositionPending,
  nearLatest,
}: {
  hasMessages: boolean
  initialPositionPending: boolean
  nearLatest: boolean
}): boolean {
  return hasMessages && (initialPositionPending || nearLatest)
}
