/**
 * Confirmation copy for the clipboard actions.
 *
 * A phone cannot show the selection a copy will take, so each surface reports the size
 * it just moved: lines and characters for text, lines for code, rows and columns for a
 * table.
 */

/** Copy confirmation copy. */
export const copy = {
  /** `{lines}` and `{chars}` describe the text that reached the clipboard. */
  copiedText: '已复制 {lines} 行 · {chars} 字',
  /** `{lines}` describes the code block that reached the clipboard. */
  copiedCode: '已复制 {lines} 行',
  /** `{rows}` and `{columns}` describe the table that reached the clipboard. */
  copiedTable: '已复制 {rows} 行 × {columns} 列',
  copyText: '复制这段文本',
  copyPayload: '复制内容',
} as const
