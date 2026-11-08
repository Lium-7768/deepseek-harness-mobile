/**
 * How long a burst of content-size changes waits before one follow jump.
 *
 * A streaming turn reports several size changes per frame: a chunk mounts, the row
 * re-measures, a tool result replaces its call row. Jumping on each one lands against
 * a height that is already stale, which reads as the text jumping up and down.
 */
export const FOLLOW_PIN_DELAY_MS = 90

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

/**
 * Decides whether a pull at the top should refetch the conversation.
 *
 * The pull is a deliberate "re-read the truth" gesture, so it must not fire while an older
 * page is already loading: the two would race for the same list and the prepend anchor
 * would restore an offset computed against a list that changed for both reasons.
 *
 * @param args - Whether a refetch is already running and whether an older page is in flight.
 * @returns True when the pull may start a refetch.
 */
export function shouldRefreshFromPull({
  refreshing,
  loadingOlder,
}: {
  refreshing: boolean
  loadingOlder: boolean
}): boolean {
  return !refreshing && !loadingOlder
}

/** Highest count the badge prints before it collapses to a dash. */
export const UNREAD_COUNT_CAP = 99

/**
 * Formats the badge on the return-to-latest control.
 *
 * Counting message rows rather than events matters: one Turn emits dozens of events, so an
 * event count would jump to the hundreds while two replies had arrived.
 *
 * @param unseen - Message rows that arrived while the reader was away from the bottom.
 * @returns The badge text, or undefined when nothing new arrived.
 */
export function unreadCountLabel(unseen: number, cap = UNREAD_COUNT_CAP): string | undefined {
  if (!Number.isFinite(unseen) || unseen <= 0) return undefined
  return unseen > cap ? `${cap}+` : String(Math.trunc(unseen))
}

/**
 * Decides whether the reader has left the bottom since the last reading position.
 *
 * @param args - Whether the reader sits at the bottom now, and whether the control is already up.
 * @returns True when the unseen baseline should be captured.
 */
export function shouldCaptureUnreadBaseline({
  nearLatest,
  returning,
}: {
  nearLatest: boolean
  returning: boolean
}): boolean {
  return !nearLatest && !returning
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

/** How long an opened conversation waits for its remembered offset before falling back. */
export const RESTORE_WAIT_MS = 1200

/** The opened transcript must still hold at least this share of the remembered height. */
export const RESTORE_MIN_CONTENT_RATIO = 0.95

/**
 * Resolves the offset an opened conversation should land on.
 *
 * A remembered position addresses the rows above it, and a conversation only grows at
 * its tail, so the same offset still names the same message once newer rows arrive. A
 * transcript that came back shorter lost those rows — the offset would then point into
 * whichever messages happen to remain — so that open falls back to the newest message.
 *
 * @param args - The remembered position and the height the opened transcript reports.
 * @returns The offset to apply, or undefined when the remembered position no longer fits.
 */
export function restoredOffsetOnOpen({
  saved,
  contentHeight,
}: {
  saved: { contentHeight: number; offsetY: number }
  contentHeight: number
}): number | undefined {
  if (![saved.contentHeight, saved.offsetY, contentHeight].every(Number.isFinite)) return undefined
  if (saved.contentHeight <= 0 || saved.offsetY <= 0) return undefined
  if (contentHeight < saved.contentHeight * RESTORE_MIN_CONTENT_RATIO) return undefined
  return Math.max(0, Math.min(saved.offsetY, contentHeight))
}
