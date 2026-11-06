import { format } from '@/locale'

/**
 * Measures what a copy action put on the clipboard.
 *
 * A phone has no pointer drag, so the reader cannot see the selection they are about
 * to copy; reporting the size afterwards is the only way to know what was taken.
 */

/** What one copy action moved: how many lines and how many characters. */
export interface CopySize {
  readonly lines: number
  readonly chars: number
}

/**
 * Counts the lines and characters of one clipboard payload.
 *
 * A trailing newline is a line terminator of the last line, not a further empty line, so
 * it does not add to the count; an empty payload has zero lines rather than one.
 *
 * @param text - The exact string handed to the clipboard.
 * @returns The line and character counts a reader can check against the source.
 */
export function measureCopy(text: string): CopySize {
  const chars = [...text].length
  if (chars === 0) return { lines: 0, chars: 0 }
  const body = text.endsWith('\n') ? text.slice(0, -1) : text
  return { lines: body.split('\n').length, chars }
}

/**
 * Groups a count for readability.
 *
 * @param value - A non-negative count.
 * @returns The count with commas above a thousand, unchanged below it.
 */
export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0'
  const whole = Math.trunc(value)
  if (whole < 1000) return String(whole)
  return whole.toLocaleString('en-US')
}

/**
 * Builds the confirmation a copy control shows for a whole message or a text block.
 *
 * @param size - The measured payload.
 * @returns Locale-resolved text such as `已复制 42 行 · 1,234 字`.
 */
export function copyTextLabel(size: CopySize): string {
  return formatCopyLabel('copy.copiedText', { lines: formatCount(size.lines), chars: formatCount(size.chars) })
}

/**
 * Builds the confirmation for a code block copy.
 *
 * @param lines - Line count of the copied code.
 * @returns Locale-resolved text such as `已复制 58 行`.
 */
export function copyCodeLabel(lines: number): string {
  return formatCopyLabel('copy.copiedCode', { lines: formatCount(lines) })
}

/**
 * Builds the confirmation for a table copy.
 *
 * @param rows - Body rows the table holds.
 * @param columns - Column count of the copied table.
 * @returns Locale-resolved text such as `已复制 12 行 × 5 列`.
 */
export function copyTableLabel({ rows, columns }: { rows: number; columns: number }): string {
  return formatCopyLabel('copy.copiedTable', {
    rows: formatCount(rows),
    columns: formatCount(columns),
  })
}

/**
 * Resolves one copy confirmation through the locale dictionary.
 *
 * Kept private so every copy surface formats numbers the same way and no caller can
 * assemble its own wording.
 *
 * @param key - Locale key naming the copy surface.
 * @param values - Placeholder values already formatted for display.
 * @returns The resolved text.
 */
function formatCopyLabel(
  key: 'copy.copiedText' | 'copy.copiedCode' | 'copy.copiedTable',
  values: Record<string, string>,
): string {
  return format(key, values)
}
