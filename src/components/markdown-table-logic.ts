/**
 * Serializes a parsed markdown table for the clipboard.
 *
 * TSV rather than markdown: pasting a tab-separated block into a spreadsheet splits
 * it into columns, while a markdown pipe table arrives as one text cell.
 */

/**
 * Builds the tab-separated text for one table.
 *
 * Tabs and newlines inside a cell would break the row and column structure, so they
 * collapse to a single space; the pipe characters a markdown table uses as delimiters
 * are ordinary cell content and stay as written.
 *
 * @param args - The table header cells and its body rows, in column order.
 * @returns One line per row, tab-separated, with the header first.
 */
export function tableToTsv({
  header,
  rows,
}: {
  header: readonly string[]
  rows: readonly (readonly string[])[]
}): string {
  return [header, ...rows].map((row) => row.map(cellForClipboard).join('\t')).join('\n')
}

/**
 * Normalizes one cell so it cannot break the tab and newline structure.
 *
 * @param cell - The raw cell text from the parsed markdown.
 * @returns The cell with any run of tabs, newlines or carriage returns collapsed to a space.
 */
function cellForClipboard(cell: string): string {
  return cell.replace(/\s*[\t\r\n]+\s*/g, ' ').trim()
}
