/**
 * Formats selected message text as the Markdown blockquote the desktop writes.
 *
 * The desktop's quote is not a separate wire part: `formatQuoteText` prefixes one `> `
 * per line, and the prompt carries ordinary Markdown. The phone reuses that exact form
 * so a quoted reply reads the same on both clients.
 *
 * @param text - Visible message text without quote markers.
 * @returns One `> `-prefixed line per normalized input line.
 */
export function formatQuoteText(text: string): string {
  return text
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
}
