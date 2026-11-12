/**
 * Unified-diff row parsing for markdown fences.
 *
 * A `diff` or `patch` fence is not code to highlight — it is a change to read line by
 * line, where the marker column carries the meaning. Parsing it here keeps the rules
 * testable without a device, and mirrors the desktop so a transcript reads the same in
 * both clients.
 */

/** Fence info strings rendered as a unified diff instead of highlighted code. */
export const DIFF_FENCE_LANGUAGES: ReadonlySet<string> = new Set(['diff', 'patch'])

/**
 * Whether a fence info string selects diff row rendering.
 *
 * @param language - The fence info string, compared case-insensitively.
 * @returns Whether the fence is a unified diff.
 */
export function isDiffFence(language: string | undefined): boolean {
  return language !== undefined && DIFF_FENCE_LANGUAGES.has(language.toLowerCase())
}

/** One row of a unified diff. */
export interface DiffFenceRow {
  /** Row role, which picks the tint and the gutter bar. */
  kind: 'add' | 'del' | 'context' | 'hunk' | 'meta'
  /** The row's whole source line, markers included. */
  raw: string
}

/** File-level chrome a unified diff carries above and between hunks. */
const META_PREFIXES = [
  'diff --git ',
  'index ',
  'old mode ',
  'new mode ',
  'new file mode ',
  'deleted file mode ',
  'similarity index ',
  'dissimilarity index ',
  'rename from ',
  'rename to ',
  'copy from ',
  'copy to ',
  'Binary files ',
  'GIT binary patch',
  '\\ No newline',
]

/** Hunk header naming both line counts; a missing count means one line. */
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/u

/**
 * Whether a `---`/`+++` line names a file rather than carrying author text.
 *
 * `git diff` writes `--- a/path` and `+++ b/path`; `diff -u` writes a path and may add
 * a timestamp after a tab. A hand-written fence saying `--- note` is a deletion of
 * "note", so path shape is what separates the two.
 */
function looksLikeFileHeader(raw: string): boolean {
  const rest = raw.slice(4)
  if (rest.includes('\t')) return true
  return /^(?:[ab]\/|\.\.\/|\/)/u.test(rest) || /^\S+\.[A-Za-z0-9]+$/u.test(rest)
}

/** Lines the hunk header says remain on each side, or undefined for a malformed one. */
function hunkRemainder(raw: string): { new: number; old: number } | undefined {
  if (!HUNK_HEADER.test(raw)) return undefined
  const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/u.exec(raw)
  if (match === null) return undefined
  return {
    old: match[2] === undefined ? 1 : Number(match[2]),
    new: match[4] === undefined ? 1 : Number(match[4]),
  }
}

/**
 * Splits a unified diff into rows, losing nothing of the source.
 *
 * The hunk header's line budget ends a hunk, so a following `---`/`+++` file header is
 * chrome again — both for a concatenated `git diff` and for `diff -u` output without
 * `diff --git` lines. A malformed header keeps its rows until the next `diff --git`,
 * which is how an authored fence renders rather than going blank.
 *
 * @param code - The fence body.
 * @returns The rows in source order, ready to draw.
 */
export function parseDiffFence(code: string): DiffFenceRow[] {
  const rows: DiffFenceRow[] = []
  let inHunk = false
  let remainder: { new: number; old: number } | undefined

  for (const raw of code.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      inHunk = false
      remainder = undefined
      rows.push({ kind: 'meta', raw })
      continue
    }
    if (raw.startsWith('@@')) {
      inHunk = true
      remainder = hunkRemainder(raw)
      rows.push({ kind: 'hunk', raw })
      continue
    }
    // A file header carries a marker column but names a file, not a line. Outside a hunk
    // an authored fence may still write `--- text` as a deletion, so the header form is
    // recognised by its path shape: a `--- a/…` / `+++ b/…` pair (or any `\t`-suffixed
    // header), never a bare `--- note`.
    if (!inHunk && (raw.startsWith('--- ') || raw.startsWith('+++ ')) && looksLikeFileHeader(raw)) {
      rows.push({ kind: 'meta', raw })
      continue
    }
    if (META_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
      rows.push({ kind: 'meta', raw })
      continue
    }
    if (raw.startsWith('+')) {
      if (remainder !== undefined) remainder.new -= 1
      rows.push({ kind: 'add', raw })
    } else if (raw.startsWith('-')) {
      if (remainder !== undefined) remainder.old -= 1
      rows.push({ kind: 'del', raw })
    } else {
      if (raw.startsWith(' ') && remainder !== undefined) {
        remainder.old -= 1
        remainder.new -= 1
      }
      rows.push({ kind: 'context', raw })
    }
    if (inHunk && remainder !== undefined && remainder.old <= 0 && remainder.new <= 0) inHunk = false
  }
  return rows
}

/**
 * Counts the added and removed lines a fence contains.
 *
 * @param rows - Parsed fence rows.
 * @returns The two line counts, for the card's header.
 */
export function diffFenceStat(rows: readonly DiffFenceRow[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const row of rows) {
    if (row.kind === 'add') added += 1
    else if (row.kind === 'del') removed += 1
  }
  return { added, removed }
}
