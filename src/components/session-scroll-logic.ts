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
