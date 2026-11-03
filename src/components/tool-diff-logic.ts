/**
 * Derives one file change from a file-mutating tool call's arguments.
 *
 * The desktop turns `write`, `edit`, and `str_replace_editor` calls into a diff
 * card instead of echoing the raw arguments, because the argument that matters
 * is which lines the model added and removed. The phone derives the same change
 * from the same arguments, so both clients show the same edit.
 */

/** One line of a derived change, in display order. */
export interface DiffLine {
  /** Whether the line was kept, added, or removed. */
  kind: 'added' | 'context' | 'removed'
  /** The line's text, without its line terminator. */
  text: string
}

/** One file's change: where it happened and what the change was. */
export interface ToolFileChange {
  /** Number of added lines, for the change's summary. */
  added: number
  /** The change in display order, untrimmed. */
  lines: DiffLine[]
  /** The tool's model-facing path, drawn verbatim. */
  path: string
  /** Number of removed lines, for the change's summary. */
  removed: number
}

/**
 * Largest line-pair grid a derived change may allocate before falling back to a
 * whole-file replacement. A 500x500 pair grid costs 250k cells, which keeps a
 * very large `write` from stalling the conversation list.
 */
const MAX_DIFF_CELLS = 250_000

/**
 * Derive a file change from one file-mutating tool call.
 *
 * @param toolName - The tool's name as the row carries it.
 * @param toolInput - The call's raw JSON arguments, when the row carries them.
 * @returns The derived change, or undefined when the call is not a file mutation.
 */
export function toolFileChange(
  toolName: string | undefined,
  toolInput: string | undefined,
): ToolFileChange | undefined {
  if (toolInput === undefined || toolInput.trim() === '') return undefined
  const args = parseArguments(toolInput)
  if (args === undefined) return undefined
  const name = (toolName ?? '').toLowerCase()
  const editor = name.includes('str_replace_editor')
  const path = editor ? readString(args.path) : readString(args.file_path)
  if (path === undefined || path.trim() === '') return undefined
  if (editor) {
    const command = readString(args.command)
    if (command === 'create') {
      const content = readString(args.file_text)
      return content === undefined ? undefined : buildChange(path, null, content)
    }
    if (command === 'str_replace') {
      const oldText = readString(args.old_str)
      const newText = readString(args.new_str)
      return oldText === undefined || newText === undefined ? undefined : buildChange(path, oldText, newText)
    }
    return undefined
  }
  if (name.includes('edit')) {
    const oldText = readString(args.old_string)
    const newText = readString(args.new_string)
    return oldText === undefined || newText === undefined ? undefined : buildChange(path, oldText, newText)
  }
  if (name.includes('write')) {
    const content = readString(args.content)
    return content === undefined ? undefined : buildChange(path, null, content)
  }
  return undefined
}

/**
 * Diff two texts line by line, keeping the longest run of unchanged lines.
 *
 * @param oldText - Content before the change, or null when the file is new.
 * @param newText - Content after the change.
 * @returns The change in display order, with added and removed lines marked.
 */
export function lineDiff(oldText: string | null, newText: string): DiffLine[] {
  const before = splitLines(oldText ?? '')
  const after = splitLines(newText)
  const prefix = commonPrefixLength(before, after)
  const suffix = commonSuffixLength(before, after, prefix)
  const head = before.slice(prefix, before.length - suffix)
  const tail = after.slice(prefix, after.length - suffix)
  const kept = [
    ...before.slice(0, prefix).map((text) => ({ kind: 'context' as const, text })),
    ...(head.length * tail.length > MAX_DIFF_CELLS
      ? [
          ...head.map((text) => ({ kind: 'removed' as const, text })),
          ...tail.map((text) => ({ kind: 'added' as const, text })),
        ]
      : longestCommonSubsequence(head, tail)),
    ...(suffix === 0 ? [] : before.slice(before.length - suffix).map((text) => ({ kind: 'context' as const, text }))),
  ]
  return kept
}

function buildChange(path: string, oldText: string | null, newText: string): ToolFileChange {
  const lines = lineDiff(oldText, newText)
  return {
    added: lines.filter((line) => line.kind === 'added').length,
    lines,
    path,
    removed: lines.filter((line) => line.kind === 'removed').length,
  }
}

function longestCommonSubsequence(before: readonly string[], after: readonly string[]): DiffLine[] {
  if (before.length === 0) return after.map((text) => ({ kind: 'added', text }))
  if (after.length === 0) return before.map((text) => ({ kind: 'removed', text }))
  const width = after.length + 1
  const grid = new Uint32Array((before.length + 1) * width)
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      grid[i * width + j] =
        before[i] === after[j]
          ? grid[(i + 1) * width + j + 1] + 1
          : Math.max(grid[(i + 1) * width + j], grid[i * width + j + 1])
    }
  }
  const lines: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      lines.push({ kind: 'context', text: before[i] })
      i += 1
      j += 1
    } else if (grid[(i + 1) * width + j] >= grid[i * width + j + 1]) {
      lines.push({ kind: 'removed', text: before[i] })
      i += 1
    } else {
      lines.push({ kind: 'added', text: after[j] })
      j += 1
    }
  }
  for (; i < before.length; i += 1) lines.push({ kind: 'removed', text: before[i] })
  for (; j < after.length; j += 1) lines.push({ kind: 'added', text: after[j] })
  return lines
}

function commonPrefixLength(before: readonly string[], after: readonly string[]): number {
  const limit = Math.min(before.length, after.length)
  let index = 0
  while (index < limit && before[index] === after[index]) index += 1
  return index
}

function commonSuffixLength(before: readonly string[], after: readonly string[], prefix: number): number {
  const limit = Math.min(before.length, after.length) - prefix
  let index = 0
  while (index < limit && before[before.length - 1 - index] === after[after.length - 1 - index]) index += 1
  return index
}

function splitLines(text: string): string[] {
  if (text === '') return []
  const withoutTrailing = text.endsWith('\n') ? text.slice(0, -1) : text
  return withoutTrailing.split('\n')
}

function parseArguments(toolInput: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(toolInput)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}
