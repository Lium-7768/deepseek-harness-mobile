import { format } from '@/locale'

/** Message action layout shared by the native user and assistant rows. */
export type MessageActionAlignment = 'user' | 'assistant'

/**
 * Returns the drawn action size and row alignment.
 *
 * `MessageIconActions.module.css .action` draws a 28pt square with a 15pt glyph
 * on an 8pt gap. The button keeps an 8pt hit slop on each side
 * ({@link MESSAGE_ACTION_HIT_SLOP}) so the platform touch target stays 44pt
 * without the icons sitting further apart than the Web's.
 */
export const MESSAGE_ACTION_HIT_SLOP = 8

/** One message action's drawn box and row alignment. */
export function messageActionLayout(alignment: MessageActionAlignment): {
  alignSelf: 'flex-end' | 'flex-start'
  height: 28
  width: 28
} {
  return alignment === 'user'
    ? { alignSelf: 'flex-end', height: 28, width: 28 }
    : { alignSelf: 'flex-start', height: 28, width: 28 }
}

/**
 * Format one message's end time for the action row.
 *
 * The Web client renders `formatMessageClock` from ui-chat: a zero-padded
 * 24-hour `HH:mm` on the same calendar day, prefixed with `clock.md` earlier
 * this year and `clock.ymd` in another year. The same text is produced here so
 * the two clients show the same clock, and truncation is left to the label's
 * `numberOfLines`.
 *
 * @param time - Event time in milliseconds since the epoch.
 * @param now - Reference instant for the day/year cut, defaulting to the wall clock.
 * @returns The Web-compatible clock string, for example `23:36` or `10月28日 23:36`.
 */
export function formatMessageTime(time: number, now: number = Date.now()): string {
  const date = new Date(time)
  const reference = new Date(now)
  const clock = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  if (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  ) {
    return clock
  }
  const params = { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() }
  const prefix =
    date.getFullYear() === reference.getFullYear()
      ? format('conversation.clockMd', params)
      : format('conversation.clockYmd', params)
  return `${prefix} ${clock}`
}

/**
 * Zero-pads one clock field to two digits.
 * @param value - Hour or minute of a local wall clock.
 * @returns The two-digit field.
 */
function pad2(value: number): string {
  return String(value).padStart(2, '0')
}
