/** Message action layout shared by the native user and assistant rows. */
export type MessageActionAlignment = 'user' | 'assistant'

/** Returns the fixed icon-only action hit area and row alignment. */
export function messageActionLayout(alignment: MessageActionAlignment): {
  alignSelf: 'flex-end' | 'flex-start'
  height: 44
  width: 44
} {
  return alignment === 'user'
    ? { alignSelf: 'flex-end', height: 44, width: 44 }
    : { alignSelf: 'flex-start', height: 44, width: 44 }
}

/**
 * Format one message's end time for the action row.
 *
 * The Web client renders this label in the message's action strip, truncated
 * with an ellipsis when the row runs out of width. The same text is produced
 * here so the two clients show the same clock, and the truncation is left to
 * the label's `numberOfLines`.
 *
 * @param time - Event time in milliseconds since the epoch.
 * @param locale - Locale used for the clock, defaulting to the runtime's.
 * @returns The local wall-clock time, for example `14:32`.
 */
export function formatMessageTime(time: number, locale?: string): string {
  return new Date(time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}
