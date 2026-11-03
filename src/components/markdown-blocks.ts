/**
 * Markdown block parsing for the native renderer.
 *
 * Kept free of React Native so the grammar is testable in a Node process and
 * the renderer only maps blocks to views.
 */

/** Column alignment a table's delimiter row declares. */
export type TableAlign = 'center' | 'left' | 'right'

export type Block = {
  kind: 'paragraph' | 'heading' | 'quote' | 'list' | 'code' | 'rule' | 'table'
  /** Table header cells, in column order. */
  header?: string[]
  /** One entry per column, from the delimiter row. */
  align?: TableAlign[]
  /** Table body cells, one array per row. */
  rows?: string[][]
  text: string
  level?: number
  marker?: string
  language?: string
  /** List entries; consecutive bullet or ordered lines form one list. */
  items?: { marker: string; text: string }[]
}
/**
 * Splits one table line into its cells.
 *
 * A leading and trailing pipe are optional (`a | b` and `| a | b |` both parse),
 * and a backslash-escaped pipe stays inside its cell.
 *
 * @param line - One markdown table row.
 * @returns The trimmed cell texts.
 */
export function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let current = ''
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index]
    if (char === '\\' && trimmed[index + 1] === '|') {
      current += '|'
      index += 1
      continue
    }
    if (char === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

/**
 * Reads one delimiter row into the table's column alignments.
 *
 * @param line - The row under the header (`| --- | :--: | --: |`).
 * @returns One alignment per column, or `undefined` when the line is not a delimiter.
 */
export function parseTableAlign(line: string): TableAlign[] | undefined {
  if (!line.includes('-') || !/^\s*\|?[\s:|-]+\|?\s*$/.test(line)) return undefined
  const cells = splitTableRow(line)
  if (cells.length === 0 || cells.some((cell) => !/^:?-{1,}:?$/.test(cell))) return undefined
  return cells.map((cell) => {
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    if (left && right) return 'center'
    return right ? 'right' : 'left'
  })
}

export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let code: string[] | undefined
  let language: string | undefined
  // Consecutive entries join one list, so the renderer can space entries by the
  // desktop's 6px instead of the 16px it puts between blocks.
  const pushListItem = (marker: string, text: string): void => {
    const last = blocks[blocks.length - 1]
    if (last?.kind === 'list') last.items?.push({ marker, text })
    else blocks.push({ kind: 'list', text: '', items: [{ marker, text }] })
  }
  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() })
      paragraph = []
    }
  }
  const isTableLine = (text: string): boolean => text.trim().includes('|')
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? ''
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/)
    if (fence) {
      if (code) {
        blocks.push({ kind: 'code', text: code.join('\n').trimEnd(), language })
        code = undefined
        language = undefined
      } else {
        flush()
        code = []
        language = fence[1] || undefined
      }
      continue
    }
    if (code) {
      code.push(line)
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    // A pipe row followed by a delimiter row opens a table; the body runs while
    // the lines keep holding pipes.
    if (isTableLine(line) && lineIndex + 1 < lines.length) {
      const align = parseTableAlign(lines[lineIndex + 1] ?? '')
      if (align !== undefined) {
        flush()
        const header = splitTableRow(line)
        const rows: string[][] = []
        let bodyIndex = lineIndex + 2
        while (bodyIndex < lines.length && isTableLine(lines[bodyIndex] ?? '')) {
          rows.push(splitTableRow(lines[bodyIndex] ?? ''))
          bodyIndex += 1
        }
        blocks.push({ kind: 'table', header, align, rows, text: '' })
        lineIndex = bodyIndex - 1
        continue
      }
    }
    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading) {
      flush()
      blocks.push({ kind: 'heading', text: heading[2], level: heading[1].length })
      continue
    }
    const quote = line.match(/^\s*>\s?(.*)$/)
    if (quote) {
      flush()
      blocks.push({ kind: 'quote', text: quote[1] })
      continue
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush()
      blocks.push({ kind: 'rule', text: '' })
      continue
    }
    const bullet = line.match(/^\s*([-*+])\s+(.+)$/)
    if (bullet) {
      flush()
      pushListItem('•', bullet[2])
      continue
    }
    const ordered = line.match(/^\s*(\d+)[.)]\s+(.+)$/)
    if (ordered) {
      flush()
      pushListItem(`${ordered[1]}.`, ordered[2])
      continue
    }
    paragraph.push(line.trim())
  }
  if (code) blocks.push({ kind: 'code', text: code.join('\n').trimEnd(), language })
  flush()
  return blocks
}

/** One column's alignment plus whether the table fills the column width. */
export interface TableLayout {
  /** Cell count the table renders, the widest of its header and rows. */
  columns: number
  /** `true` when the table stretches to the column instead of scrolling. */
  fills: boolean
  /** Per-column alignment, defaulting to left where the delimiter row omits it. */
  align: TableAlign[]
}

/**
 * Resolves a parsed table's rendering layout.
 *
 * `MarkdownText.module.css` fills the column below four columns and lets a
 * wider table keep a readable cell floor and scroll sideways.
 *
 * @param block - A parsed table block.
 * @returns Column count, fill mode, and per-column alignment.
 */
export function tableLayout(block: Block): TableLayout {
  const header = block.header ?? []
  const rows = block.rows ?? []
  const columns = Math.max(header.length, ...rows.map((row) => row.length), 1)
  const declared = block.align ?? []
  return {
    align: Array.from({ length: columns }, (_, column) => declared[column] ?? 'left'),
    columns,
    fills: columns < 4,
  }
}

/** CSS block margins collapse on desktop; native gaps must be explicit to avoid double heading spacing. */
export function markdownBlockGap(block: Block, previous?: Block): number {
  if (!previous) return 0
  if (block.kind === 'heading') return (block.level ?? 4) <= 3 ? 28 : 16
  if (previous.kind === 'heading' && (previous.level ?? 4) >= 4 && block.kind === 'list') return 8
  return 16
}

/** Only actionable link schemes are handed to the OS; desktop project paths remain plain text. */
export function markdownLinkTarget(token: string): { label: string; url?: string } {
  const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
  if (!match) return { label: token }
  return { label: match[1], ...(/^(https?:|mailto:|tel:)/i.test(match[2]) ? { url: match[2] } : {}) }
}
