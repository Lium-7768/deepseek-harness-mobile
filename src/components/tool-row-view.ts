/**
 * Turns one tool call's raw arguments and output into the fields a row shows.
 *
 * The desktop gives each tool its own card model, because a file read, a search, and a
 * shell command carry different things a reader needs before expanding anything: a path
 * and a line count, a pattern and its hit count, a command line. The phone had one card
 * built from the three generic fields the projection carries, so every row looked the
 * same and the useful part stayed behind the disclosure.
 *
 * This module holds the same derivations, reduced to what a phone row shows. It is pure:
 * no React, no styles, so each rule is testable on its own.
 */

/** One tool call, as far as a row is concerned. */
export type ToolCall = {
  toolName: string
  /** Raw argument JSON, when the projection carried it. */
  toolInput?: string
  /** Rendered result text, when the call finished. */
  output?: string
  /** The call's own metadata, which names a file mutation's path and operation. */
  toolMeta?: Readonly<Record<string, unknown>>
  state: 'completed' | 'failed' | 'running'
}

/** The shape a row renders, once a tool's own fields are known. */
export type ToolRowView =
  | { kind: 'read'; path: string; lineCount?: number; lang?: string; body?: string }
  | { kind: 'search'; pattern: string; scope?: string; hitFiles?: number; hitLines?: number; body?: string }
  | { kind: 'web'; query: string; url?: string; body?: string }
  | { kind: 'todo'; items: TodoItem[] }
  | { kind: 'command'; command: string; description?: string; body?: string }
  | { kind: 'mutation'; path: string; operation: string; body?: string }
  | { kind: 'office'; path: string; format?: string; body?: string }
  | { kind: 'image'; path: string; body?: string }
  | { kind: 'generic'; body?: string }

/** One item of a todo list, as the call reports it. */
export type TodoItem = { status: 'pending' | 'in_progress' | 'completed'; text: string }

/**
 * Parse a call's argument text.
 *
 * @param toolInput - Raw argument JSON, as the projection carries it.
 * @returns The parsed object, or undefined when it is absent or not an object.
 */
function argumentsOf(toolInput: string | undefined): Record<string, unknown> | undefined {
  if (toolInput === undefined) return undefined
  const raw = toolInput.trim()
  if (raw === '') return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    return parsed as Record<string, unknown>
  } catch {
    return undefined
  }
}

/**
 * Read the first string field present under one of several names.
 *
 * Tools name the same argument differently (`file_path`, `path`, `file`), so a row asks
 * for every spelling its tool family uses rather than one.
 *
 * @param record - The parsed arguments.
 * @param names - Field names to try, in order.
 * @returns The first non-empty string, or undefined.
 */
function firstString(record: Record<string, unknown> | undefined, names: readonly string[]): string | undefined {
  if (record === undefined) return undefined
  for (const name of names) {
    const value = record[name]
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return undefined
}

/** Names that identify a file-reading call. */
const READ_TOOLS = new Set(['read', 'read_file', 'file_read'])
/** Names that identify a search call, and which argument carries its pattern. */
const SEARCH_TOOLS: Record<string, 'pattern' | 'query'> = { grep: 'pattern', glob: 'pattern', search: 'query' }
/** Office document tools, which each name the file they read or write. */
const OFFICE_TOOLS = new Set(['office_render', 'office_convert', 'office_recalculate'])
/** Names that identify an image read. */
const IMAGE_TOOLS = new Set(['read_image', 'view_image', 'image'])

/** Names that identify a network read. */
const WEB_TOOLS = new Set(['web_search', 'web_fetch', 'fetch', 'search_web'])
/** What a mutation's recorded operation reads as in a row. */
const MUTATION_VERB: Record<string, string> = {
  create: '新建',
  delete: '删除',
  update: '修改',
  write: '写入',
}

/** Names that replace a whole list, where the output is the list itself. */
const TODO_TOOLS = new Set(['todo_write', 'todo'])

/**
 * Count the lines of a result body.
 *
 * @param body - Rendered result text.
 * @returns The number of non-empty lines.
 */
function lineCount(body: string | undefined): number | undefined {
  if (body === undefined) return undefined
  const lines = body.split('\n').filter((line) => line.trim() !== '')
  return lines.length === 0 ? undefined : lines.length
}

/**
 * Read a todo list out of a call's arguments or its output.
 *
 * The list arrives either as the argument the model wrote or as the result the tool
 * printed, so both are tried in that order.
 *
 * @param record - The parsed arguments.
 * @param body - Rendered result text.
 * @returns The items, or an empty array when neither carries a list.
 */
function todoItems(record: Record<string, unknown> | undefined, body: string | undefined): TodoItem[] {
  const source = record?.todos ?? record?.items
  if (Array.isArray(source)) {
    const items: TodoItem[] = []
    for (const entry of source) {
      if (entry === null || typeof entry !== 'object') continue
      const item = entry as Record<string, unknown>
      const text = typeof item.content === 'string' ? item.content : item.subject
      if (typeof text !== 'string' || text.trim() === '') continue
      const raw = typeof item.status === 'string' ? item.status : 'pending'
      const status = raw === 'completed' || raw === 'in_progress' ? raw : 'pending'
      items.push({ status, text: text.trim() })
    }
    if (items.length > 0) return items
  }
  // The tool prints one `- [x] text` per item when the call is inspected.
  if (body === undefined) return []
  const parsed: TodoItem[] = []
  for (const line of body.split('\n')) {
    const match = /^\s*[-*]\s*\[( |x|X|~)\]\s*(.+)$/.exec(line)
    if (match === null) continue
    const mark = match[1]
    const text = match[2]?.trim()
    if (text === undefined || text === '') continue
    parsed.push({ status: mark === 'x' || mark === 'X' ? 'completed' : mark === '~' ? 'in_progress' : 'pending', text })
  }
  return parsed
}

/**
 * Derive the row one tool call renders as.
 *
 * @param call - The call's name, arguments, result, and state.
 * @returns The fields its row shows.
 */
export function toolRowView(call: ToolCall): ToolRowView {
  const record = argumentsOf(call.toolInput)
  const name = call.toolName

  if (READ_TOOLS.has(name)) {
    const path = firstString(record, ['file_path', 'path', 'file'])
    if (path !== undefined)
      return { kind: 'read', path, lineCount: lineCount(call.output), ...(call.output ? { body: call.output } : {}) }
  }

  const searchField = SEARCH_TOOLS[name]
  if (searchField !== undefined) {
    const pattern = firstString(record, [searchField, 'pattern', 'query'])
    if (pattern !== undefined) {
      const scope = firstString(record, ['path', 'include', 'glob'])
      const hits = countSearchHits(call.output)
      return {
        kind: 'search',
        pattern,
        ...(scope === undefined ? {} : { scope }),
        ...(hits === undefined ? {} : hits),
        ...(call.output ? { body: call.output } : {}),
      }
    }
  }

  if (WEB_TOOLS.has(name)) {
    const query = firstString(record, ['query', 'url', 'q'])
    if (query !== undefined) {
      const url = firstString(record, ['url'])
      return {
        kind: 'web',
        query,
        ...(url === undefined ? {} : { url }),
        ...(call.output ? { body: call.output } : {}),
      }
    }
  }

  if (TODO_TOOLS.has(name)) {
    const items = todoItems(record, call.output)
    if (items.length > 0) return { kind: 'todo', items }
  }

  if (OFFICE_TOOLS.has(name)) {
    const path = firstString(record, ['input', 'path', 'file_path'])
    if (path !== undefined) {
      const format = firstString(record, ['format', 'outputFormat'])
      return {
        kind: 'office',
        path,
        ...(format === undefined ? {} : { format }),
        ...(call.output ? { body: call.output } : {}),
      }
    }
  }

  if (IMAGE_TOOLS.has(name)) {
    const path = firstString(record, ['path', 'file_path', 'file'])
    if (path !== undefined) return { kind: 'image', path, ...(call.output ? { body: call.output } : {}) }
  }

  // A file mutation reports the file it wrote and what it did in the call's metadata,
  // which is the pair the desktop's own mutation row leads with.
  const mutatedPath = firstString(call.toolMeta, ['path', 'filePath'])
  if (mutatedPath !== undefined) {
    const operation = firstString(call.toolMeta, ['operation']) ?? 'update'
    return { kind: 'mutation', path: mutatedPath, operation, ...(call.output ? { body: call.output } : {}) }
  }

  const command = firstString(record, ['command', 'cmd'])
  if (command !== undefined) {
    // The desktop prefers the call's own description over the command line: a sentence
    // reads in a flow where a shell invocation does not. The command stays in the view for
    // the expanded body.
    const description = firstString(record, ['description'])
    return {
      kind: 'command',
      command,
      ...(description === undefined ? {} : { description }),
      ...(call.output ? { body: call.output } : {}),
    }
  }

  return { kind: 'generic', ...(call.output ? { body: call.output } : {}) }
}

/**
 * Count what a search result reports.
 *
 * Two shapes are counted: a list of matched files with their matches, and the flat
 * `path:line: text` form a terminal-style search prints.
 *
 * @param body - Rendered result text.
 * @returns The file and line counts, or undefined when the body does not say.
 */
function countSearchHits(body: string | undefined): { hitFiles: number; hitLines: number } | undefined {
  if (body === undefined) return undefined
  const trimmed = body.trim()
  if (trimmed === '') return undefined
  const files = new Set<string>()
  let lines = 0
  for (const line of trimmed.split('\n')) {
    const match = /^([^:\n]+):(\d+):/.exec(line)
    if (match === null) continue
    const file = match[1]
    if (file === undefined) continue
    files.add(file)
    lines += 1
  }
  if (lines === 0) return undefined
  return { hitFiles: files.size, hitLines: lines }
}

/**
 * Condense a derived row into the one line a closed row shows.
 *
 * The desktop prints `<verb> · <subject>`; the verb is the row's title, so this returns
 * only the subject. Each tool names the thing a reader would ask for: which file, which
 * pattern and how many hits, which command.
 *
 * @param view - The row derived from one call.
 * @returns The subject line, or undefined when the row falls back to its generic form.
 */
export function describeRow(view: ToolRowView): string | undefined {
  switch (view.kind) {
    case 'read':
      return view.lineCount === undefined ? view.path : `${view.path} · ${String(view.lineCount)} 行`
    case 'search': {
      const hits =
        view.hitLines === undefined ? undefined : `${String(view.hitFiles ?? 0)} 个文件 · ${String(view.hitLines)} 处`
      const head = view.scope === undefined ? view.pattern : `${view.pattern} · ${view.scope}`
      return hits === undefined ? head : `${head} → ${hits}`
    }
    case 'web':
      return view.url ?? view.query
    case 'todo': {
      const done = view.items.filter((item) => item.status === 'completed').length
      return `${String(done)}/${String(view.items.length)}`
    }
    case 'command':
      return view.description ?? view.command
    case 'mutation':
      return `${MUTATION_VERB[view.operation] ?? view.operation} · ${view.path}`
    case 'office':
      return view.format === undefined ? view.path : `${view.path} → ${view.format}`
    case 'image':
      return view.path
    case 'generic':
      return undefined
    // A new kind must decide what its one line says rather than print nothing.
    default:
      return undefined
  }
}
