/** Display text preparation and summary helpers for model reasoning, matching desktop `ui-chat`. */

const LIVE_DETAIL_MAX_CHARS = 160

/**
 * Prepare complete or streaming reasoning for display by stripping a leading
 * `<signature>...</signature>` envelope.
 * @param text - Original complete or streaming reasoning.
 * @returns Display text, or empty string when only signature bytes exist so far.
 */
export function reasoningText(text: string): string {
  if (text[0] !== '<') return text
  const opening = '<signature>'
  if (opening.startsWith(text)) return ''
  if (!text.startsWith(opening)) return text
  const closing = '</signature>'
  const end = text.indexOf(closing, opening.length)
  if (end === -1) return ''
  let start = end + closing.length
  while (start < text.length) {
    if (text[start] === '\n') start += 1
    else if (text[start] === '\r' && text[start + 1] === '\n') start += 2
    else break
  }
  return text.slice(start)
}

/** Whether a reasoning block only carried a signature envelope and nothing to display. */
export function isHiddenReasoning(rawText: string): boolean {
  const text = reasoningText(rawText)
  return text !== rawText && text.trim() === ''
}

function firstLine(text: string): string {
  const newline = text.indexOf('\n')
  return newline === -1 ? text : text.slice(0, newline)
}

function latestCompletedParagraphFirstLine(text: string): string {
  let summary = ''
  let paragraphStart = 0
  const separator = /\r?\n(?:[\t ]*\r?\n)+/g
  while (true) {
    const nextParagraph = separator.exec(text)
    const paragraphEnd = nextParagraph === null ? text.length : nextParagraph.index + nextParagraph[0].indexOf('\n')
    const newline = text.indexOf('\n', paragraphStart)
    if (newline !== -1 && newline <= paragraphEnd) {
      const candidate = text.slice(paragraphStart, newline).trim()
      if (candidate !== '') summary = candidate
    }
    if (nextParagraph === null) return summary
    paragraphStart = nextParagraph.index + nextParagraph[0].length
  }
}

/**
 * Computes the collapsed header summary for one reasoning block, mirroring desktop `ReasoningRow`.
 * @param displayText - Reasoning text after `reasoningText()` stripping.
 * @param running - Whether the reasoning block is still streaming.
 * @returns Single-line preview with double-asterisk markers removed.
 */
export function reasoningSummary(displayText: string, running: boolean): string {
  const raw = running ? latestCompletedParagraphFirstLine(displayText) : firstLine(displayText)
  return raw.replaceAll('**', '')
}

/** Normalizes and bounds a live process detail line to 160 characters, matching desktop `process-activity`. */
export function normalizeLiveDetail(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= LIVE_DETAIL_MAX_CHARS) return normalized
  const chars = Array.from(normalized)
  if (chars.length <= LIVE_DETAIL_MAX_CHARS) return normalized
  return `${chars
    .slice(0, LIVE_DETAIL_MAX_CHARS - 1)
    .join('')
    .trimEnd()}…`
}

/** Extracts the latest non-empty paragraph of a live reasoning block for the group header. */
export function latestReasoningDetail(rawText: string): string {
  const paragraphs = reasoningText(rawText).split(/\r?\n[\t ]*\r?\n/)
  for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
    const paragraph = paragraphs[index]
    if (paragraph === undefined) continue
    const detail = normalizeLiveDetail(paragraph.replaceAll('**', ''))
    if (detail !== '') return detail
  }
  return ''
}
