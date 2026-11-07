import type { MobileReferencePayload } from '@/types/mobile'

/**
 * A live `@` trigger: the reference token being typed at the caret.
 *
 * The grammar is the Host's own (`file-reference/grammar`): a token opens at the
 * start of the draft or after whitespace, so an `@` inside a word — an email
 * address — stays prose. Whitespace inside a path needs the quoted form
 * `@"path with spaces`, which stays open until the closing quote.
 */
export interface MentionTrigger {
  kind: 'mention'
  /** Path text after `@` or `@"`. */
  query: string
  /** Whether the caret sits inside an explicitly opened quoted path. */
  quoted: boolean
  /** Start of the token, including the `@`. */
  start: number
  /** Caret offset that ends the token, so a pick can replace exactly this span. */
  end: number
}

const QUOTED = /(?:^|\s)(@"([^"]*))$/u
const PLAIN = /(?:^|\s)(@([^\s]*))$/u

/**
 * Detect the `@` trigger at the caret.
 *
 * @param text - The whole draft.
 * @param caret - Selection start, clamped into the draft.
 * @returns The trigger and the span it covers, or undefined when there is none.
 */
export function mentionTrigger(text: string, caret: number): MentionTrigger | undefined {
  const end = Math.max(0, Math.min(caret, text.length))
  const before = text.slice(0, end)
  const quoted = QUOTED.exec(before)
  if (quoted?.[1] !== undefined) {
    return { end, kind: 'mention', query: quoted[2] ?? '', quoted: true, start: end - quoted[1].length }
  }
  const plain = PLAIN.exec(before)
  if (plain?.[1] === undefined) return undefined
  return { end, kind: 'mention', query: plain[2] ?? '', quoted: false, start: end - plain[1].length }
}

/**
 * Format one picked path as draft text.
 *
 * A directory keeps a trailing slash so the next keystroke lists its children,
 * and a quoted directory leaves its quote open for the same reason.
 *
 * @param path - The picked workspace path.
 * @param kind - Whether the row was a file or a directory.
 * @param preserveQuote - Keep the reader's quote even when the path has no space.
 * @returns The mention text, or undefined for a path the grammar cannot carry.
 */
export function formatFileMention(
  path: string,
  kind: 'file' | 'directory',
  preserveQuote: boolean,
): string | undefined {
  const target = kind === 'directory' ? `${path}/` : path
  // Control characters and a stray quote would break the token the Host parses.
  if (/[\u0000-\u001f\u007f-\u009f"]/u.test(target)) return undefined
  const quoted = preserveQuote || /\s/u.test(target)
  if (!quoted) return `@${target}`
  if (kind === 'directory') return `@"${target}`
  return `@"${target}"`
}

/**
 * Replace the trigger span with one picked mention.
 *
 * @param text - The whole draft.
 * @param trigger - The trigger being replaced.
 * @param mention - The text to insert.
 * @param openEnded - Skip the trailing space, so a directory mention can be
 * extended into a deeper path instead of starting a new word.
 * @returns The new draft and the caret offset after the inserted text.
 */
export function applyMentionPick(
  text: string,
  trigger: MentionTrigger,
  mention: string,
  openEnded = false,
): { text: string; caret: number } {
  const inserted = openEnded ? mention : `${mention} `
  const next = `${text.slice(0, trigger.start)}${inserted}${text.slice(trigger.end)}`
  return { caret: trigger.start + inserted.length, text: next }
}

/** One rendered menu row: the label the reader sees and the text a pick inserts. */
export interface MentionRow {
  label: string
  mention: string
  kind: 'file' | 'directory' | 'session'
  /** Printed under the label; identifies a Session's workspace or a path kind. */
  detail?: string
}

/** How many rows of each source the phone menu prints. */
export const MENTION_ROW_LIMIT = 6

/**
 * Project both candidate lists into menu rows.
 *
 * The Host already filtered by the query and ordered its own results, so the
 * rows keep that order and are only capped: a phone menu is a screen-height
 * list, not a scrollable file browser.
 *
 * @param payload - Both candidate lists the Host returned for this query.
 * @param quoted - Whether the trigger is quoted, so paths are formatted to stay inside it.
 * @returns File rows first, then Session rows.
 */
export function mentionRows(payload: MobileReferencePayload, quoted: boolean): MentionRow[] {
  const files: MentionRow[] = []
  for (const file of payload.files.slice(0, MENTION_ROW_LIMIT)) {
    const mention = formatFileMention(file.path, file.kind, quoted)
    // A path the grammar cannot carry is not offered: picking it would send a
    // mention the Host reads as different text.
    if (mention !== undefined) files.push({ kind: file.kind, label: file.path, mention })
  }
  const sessions: MentionRow[] = payload.sessions.slice(0, MENTION_ROW_LIMIT).map((session) => ({
    detail: session.sameWorkspace ? undefined : session.sessionId,
    kind: 'session',
    label: session.displayTitle ?? session.label,
    mention: session.mention,
  }))
  return [...files, ...sessions]
}

/**
 * Replace the trigger span with one picked row.
 *
 * A directory leaves the token open — its mention ends in `/`, or in an
 * unterminated quote for a path with spaces — so the reader can keep typing the
 * rest of the path after the menu closes.
 *
 * @param text - The whole draft.
 * @param trigger - The trigger being replaced.
 * @param row - The picked row.
 * @returns The new draft and the caret offset after the inserted text.
 */
export function pickMention(text: string, trigger: MentionTrigger, row: MentionRow): { text: string; caret: number } {
  return applyMentionPick(text, trigger, row.mention, row.kind === 'directory')
}
