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
  /**
   * The call's arguments, either as JSON text or already parsed.
   *
   * The Host records the same field both ways depending on the tool, so the row accepts
   * either rather than trusting one.
   */
  toolInput?: unknown
  /** Rendered result text, when the call finished. */
  output?: string
  /** The call's own metadata, which names a file mutation's path and operation. */
  toolMeta?: Readonly<Record<string, unknown>> | null
  state: 'completed' | 'failed' | 'running'
}

import { format, t as message, type MessageKey } from '@/locale'

/** The shape a row renders, once a tool's own fields are known. */
export type ToolRowView =
  | { kind: 'read'; path: string; lineCount?: number; lang?: string; body?: string }
  | { kind: 'search'; pattern: string; scope?: string; hitFiles?: number; hitLines?: number; body?: string }
  | { kind: 'web'; query: string; url?: string; body?: string }
  | { kind: 'todo'; items: TodoItem[] }
  | { kind: 'question'; items: QuestionItem[]; answered: boolean }
  | { kind: 'command'; command: string; description?: string; exitCode?: number; signal?: string; body?: string }
  | { kind: 'mutation'; path: string; operation: string; body?: string }
  | { kind: 'office'; path: string; format?: string; body?: string }
  | { kind: 'image'; path: string; body?: string }
  | { kind: 'code'; description?: string; language?: string; firstLine?: string; source?: string; body?: string }
  | { kind: 'job'; jobId: string; waiting?: boolean; body?: string }
  | { kind: 'skill'; skillName: string; body?: string }
  | { kind: 'goal'; action: string; detail?: string; body?: string }
  | { kind: 'generic'; body?: string }

/** One item of a todo list, as the call reports it. */
export type TodoItem = { status: 'pending' | 'in_progress' | 'completed'; text: string }

/** One question the call asked, with the answer the reader gave it. */
export type QuestionItem = {
  /** The question as asked. */
  question: string
  /** Optional supporting detail the caller kept out of the option labels. */
  detail?: string
  /** Labels the caller offered as choices. */
  options: readonly string[]
  /** Answers the reader gave; empty while the question is still unanswered. */
  answers: readonly string[]
}

/**
 * Parse a call's argument text.
 *
 * @param toolInput - Raw argument JSON, as the projection carries it.
 * @returns The parsed object, or undefined when it is absent or not an object.
 */
function argumentsOf(toolInput: unknown): Record<string, unknown> | undefined {
  if (toolInput === undefined || toolInput === null) return undefined
  // The Host records this field as JSON text for some tools and as an object for others.
  if (typeof toolInput === 'object' && !Array.isArray(toolInput)) return toolInput as Record<string, unknown>
  if (typeof toolInput !== 'string') return undefined
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
function firstString(record: Record<string, unknown> | null | undefined, names: readonly string[]): string | undefined {
  // A call may record `meta: null`, which the wire keeps as JSON null rather than omitting it.
  if (record === undefined || record === null) return undefined
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

/** Tools that load a named skill. */
const SKILL_TOOLS = new Set(['skill', 'load_skill'])
/** Tools that change a session goal, which reports the action it took. */
const GOAL_TOOLS = new Set(['update_goal', 'create_goal'])

/** Tools that run a snippet rather than a shell command. */
const CODE_TOOLS = new Set(['run_code', 'cua_run_code', 'code', 'execute_code', 'eval'])

/** Desktop `TOOL_TITLE_KEYS` mapping so every built-in tool names its exact action. */
const TOOL_TITLE_KEYS: Readonly<Record<string, MessageKey>> = {
  grep: 'tool.titleGrep',
  glob: 'tool.titleGlob',
  web_search: 'tool.titleWebSearch',
  web_fetch: 'tool.titleWebFetch',
  todo_write: 'tool.titleTodo',
  todo: 'tool.titleTodo',
  ask_user_question: 'tool.titleAsk',
  request_user_input: 'tool.titleAsk',
  create_goal: 'tool.titleCreateGoal',
  get_goal: 'tool.titleGetGoal',
  update_goal: 'tool.titleUpdateGoal',
  schedule_create: 'tool.titleCreateSchedule',
  schedule_list: 'tool.titleListSchedules',
  schedule_view: 'tool.titleViewSchedule',
  schedule_edit: 'tool.titleEditSchedule',
  schedule_delete: 'tool.titleDeleteSchedule',
  schedule_update: 'tool.titleUpdateSchedule',
  workflow: 'tool.titleWorkflow',
  ralph: 'tool.titleRalph',
  subagent: 'tool.titleSubagent',
  subagent_fork: 'tool.titleSubagentFork',
  list_agents: 'tool.titleListAgents',
  list_subagent_models: 'tool.titleListModels',
  send_message: 'tool.titleSendMessage',
  interrupt_agent: 'tool.titleInterruptAgent',
  wait_agent: 'tool.titleWaitAgent',
  spawn_teammate: 'tool.titleSpawnTeammate',
  team_task_create: 'tool.titleCreateTeamTask',
  team_task_get: 'tool.titleGetTeamTask',
  team_task_update: 'tool.titleUpdateTeamTask',
  team_task_list: 'tool.titleListTeamTasks',
  job_list: 'tool.titleListJobs',
  job_output: 'tool.titleReadJob',
  job_kill: 'tool.titleKillJob',
  terminal_open: 'tool.titleOpenTerminal',
  terminal_read: 'tool.titleReadTerminal',
  terminal_list: 'tool.titleListTerminals',
  terminal_signal: 'tool.titleSignalTerminal',
  terminal_close: 'tool.titleCloseTerminal',
  lsp: 'tool.titleLsp',
  plugin_manager: 'tool.titlePluginManager',
  plugin_market: 'tool.titlePluginMarket',
  skill: 'tool.titleSkill',
  load_skill: 'tool.titleSkill',
  office_render: 'tool.titleOfficeRender',
  office_convert: 'tool.titleOfficeConvert',
  office_recalculate: 'tool.titleOfficeRecalculate',
  cordis_package_inspect: 'tool.titleInspect',
  cordis_runtime_inspect: 'tool.titleInspect',
  cordis_inspect: 'tool.titleInspect',
  cordis_inspect_list: 'tool.titleInspectProviders',
  cordis_inspect_query: 'tool.titleQueryRuntime',
  cordis_inspect_self: 'tool.titleInspectPlugins',
  cordis_run: 'tool.titleRunCordis',
  cordis_stop: 'tool.titleStopCordis',
  cordis_undefine: 'tool.titleRemoveCordis',
  session_event_read: 'tool.titleReadEvent',
  session_event_search: 'tool.titleSearchEvents',
  session_event_trace: 'tool.titleTraceEvent',
  session_search: 'tool.titleSearchSessions',
  session_trace: 'tool.titleTraceSession',
}

/**
 * Returns the desktop locale title key for a built-in tool name, if one exists.
 *
 * @param toolName - Wire tool name.
 * @returns Exact `tool.title*` locale key, or `undefined` to fall back to the variant verb.
 */
export function toolTitleKey(toolName: string): MessageKey | undefined {
  return TOOL_TITLE_KEYS[toolName]
}

/**
 * Extracts a trailing shell exit-code or terminating-signal marker, matching desktop
 * `terminal-card-model.ts parseExitStatus`.
 */
function parseShellExitStatus(text: string): { output: string; exitCode?: number; signal?: string } {
  const signal = /(?:^|\n)\[killed by signal: ([^\]\n]+)\]$/.exec(text)
  if (signal?.[1] !== undefined) return { output: text.slice(0, signal.index), signal: signal[1] }
  const exit = /(?:^|\n)\[exit code: (-?\d+|null)\]$/.exec(text)
  if (exit?.[1] !== undefined) {
    const parsed = exit[1] === 'null' ? undefined : Number(exit[1])
    return { output: text.slice(0, exit.index), ...(parsed === undefined ? {} : { exitCode: parsed }) }
  }
  return { output: text }
}

/** Tools that read one background job's output, which is named by its id. */
const JOB_TOOLS = new Set(['job_output', 'job_kill', 'job_log'])

/** Names that identify a network read. */
const WEB_TOOLS = new Set(['web_search', 'web_fetch', 'fetch', 'search_web'])
/** What a mutation's recorded operation reads as in a row. */
const MUTATION_VERB: Record<string, () => string> = {
  create: () => message('tool.actionCreate'),
  delete: () => message('tool.actionDelete'),
  update: () => message('tool.actionUpdate'),
  write: () => message('tool.actionWrite'),
}

/** Names that replace a whole list, where the output is the list itself. */
const TODO_TOOLS = new Set(['todo_write', 'todo'])

/** Tools that put a question to the reader and wait for the answer. */
const QUESTION_TOOLS = new Set(['ask_user_question', 'request_user_input'])

/**
 * Reads the questions a call asked and the answers the reader gave.
 *
 * The Host records the questions in the call's arguments and the reader's answers in
 * the result, so both sides are needed to show a question rather than a bare tool name.
 *
 * @param record - The call's parsed arguments.
 * @param body - The call's rendered result text.
 * @returns One entry per question the call carried.
 */
function questionItems(record: Record<string, unknown> | undefined, body: string | undefined): QuestionItem[] {
  const source = record?.questions
  if (!Array.isArray(source)) return []
  const answers = answerMap(body)
  const items: QuestionItem[] = []
  for (const entry of source) {
    if (entry === null || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const question = typeof item.question === 'string' ? item.question.trim() : ''
    if (question === '') continue
    const detail = typeof item.detail === 'string' && item.detail.trim() !== '' ? item.detail.trim() : undefined
    const options = Array.isArray(item.options)
      ? item.options
          .map((option) =>
            option !== null &&
            typeof option === 'object' &&
            typeof (option as Record<string, unknown>).label === 'string'
              ? ((option as Record<string, unknown>).label as string).trim()
              : undefined,
          )
          .filter((label): label is string => label !== undefined && label !== '')
      : []
    const id = typeof item.id === 'string' ? item.id : undefined
    items.push({
      question,
      ...(detail === undefined ? {} : { detail }),
      options,
      answers: id === undefined ? [] : (answers.get(id) ?? []),
    })
  }
  return items
}

/**
 * Reads the answers out of a finished call's result text.
 *
 * The result lists one answered question per line or as JSON; both forms key the answer
 * by the question id so the question keeps its wording while its answer arrives.
 *
 * @param body - The call's rendered result text.
 * @returns Selected labels keyed by question id.
 */
function answerMap(body: string | undefined): Map<string, string[]> {
  const out = new Map<string, string[]>()
  if (body === undefined || body.trim() === '') return out
  let parsed: Record<string, unknown> | undefined
  try {
    const value: unknown = JSON.parse(body)
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) parsed = value as Record<string, unknown>
  } catch {
    parsed = undefined
  }
  const list = parsed?.answers
  if (Array.isArray(list)) {
    for (const entry of list) {
      if (entry === null || typeof entry !== 'object') continue
      const item = entry as Record<string, unknown>
      const id = typeof item.id === 'string' ? item.id : undefined
      if (id === undefined) continue
      const selected = Array.isArray(item.selected)
        ? item.selected.filter((value): value is string => typeof value === 'string')
        : typeof item.selected === 'string'
          ? [item.selected]
          : []
      const custom = typeof item.custom === 'string' && item.custom.trim() !== '' ? [item.custom.trim()] : []
      out.set(id, [...selected, ...custom])
    }
  }
  return out
}

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

  if (QUESTION_TOOLS.has(name)) {
    const questions = questionItems(record, call.output)
    if (questions.length > 0)
      return {
        kind: 'question',
        items: questions,
        answered: questions.every((item) => item.answers.length > 0),
      }
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

  // A mutation reports both the file and what it did. `operation` is what distinguishes it:
  // a result also records `path` for calls that merely named a file — an image read, an
  // office render — and treating that path as a mutation would describe them as writes.
  const operation = firstString(call.toolMeta, ['operation'])
  const mutatedPath = firstString(call.toolMeta, ['path', 'filePath'])
  if (operation !== undefined && mutatedPath !== undefined)
    return { kind: 'mutation', path: mutatedPath, operation, ...(call.output ? { body: call.output } : {}) }

  if (SKILL_TOOLS.has(name)) {
    const skillName = firstString(record, ['name', 'skill'])
    if (skillName !== undefined) return { kind: 'skill', skillName, ...(call.output ? { body: call.output } : {}) }
  }

  if (GOAL_TOOLS.has(name)) {
    const action = firstString(record, ['action'])
    if (action !== undefined) {
      // A blocked goal says why, which is the only part of the call a reader needs.
      const detail = firstString(record, ['blocked_reason', 'objective'])
      return {
        kind: 'goal',
        action,
        ...(detail === undefined ? {} : { detail }),
        ...(call.output ? { body: call.output } : {}),
      }
    }
  }

  if (CODE_TOOLS.has(name)) {
    const code = firstString(record, ['code', 'source', 'script'])
    const description = firstString(record, ['description'])
    if (code !== undefined || description !== undefined) {
      const language = firstString(record, ['language', 'lang'])
      // The desktop prefers the call's own description (`SUMMARY_KEYS.code = ['description']`),
      // falling back to the snippet's first line only when no description was supplied.
      const firstLine = code
        ?.split('\n')
        .find((line) => line.trim() !== '')
        ?.trim()
        .slice(0, 80)
      return {
        kind: 'code',
        ...(description === undefined ? {} : { description }),
        ...(language === undefined ? {} : { language }),
        ...(firstLine === undefined ? {} : { firstLine }),
        ...(code === undefined ? {} : { source: code }),
        ...(call.output ? { body: call.output } : {}),
      }
    }
  }

  if (JOB_TOOLS.has(name)) {
    const jobId = firstString(record, ['job_id', 'jobId', 'id'])
    if (jobId !== undefined) {
      // A waiting read blocks until the job finishes; the row says so, because the reader
      // otherwise cannot tell a slow job from a stuck one.
      const waiting = record?.wait === true
      return {
        kind: 'job',
        jobId,
        ...(waiting ? { waiting: true } : {}),
        ...(call.output ? { body: call.output } : {}),
      }
    }
  }

  const command = firstString(record, ['command', 'cmd'])
  if (command !== undefined) {
    // The desktop prefers the call's own description over the command line: a sentence
    // reads in a flow where a shell invocation does not. The command stays in the view for
    // the expanded body.
    const description = firstString(record, ['description'])
    const parsedExit =
      call.output !== undefined && call.state !== 'running' ? parseShellExitStatus(call.output) : undefined
    const body = parsedExit === undefined ? call.output : parsedExit.output || undefined
    return {
      kind: 'command',
      command,
      ...(description === undefined ? {} : { description }),
      ...(parsedExit?.exitCode === undefined ? {} : { exitCode: parsedExit.exitCode }),
      ...(parsedExit?.signal === undefined ? {} : { signal: parsedExit.signal }),
      ...(body ? { body } : {}),
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
      return view.lineCount === undefined
        ? view.path
        : format('tool.pathLineCount', { path: view.path, count: view.lineCount })
    case 'search': {
      const hits =
        view.hitLines === undefined
          ? undefined
          : format('tool.searchHits', { files: view.hitFiles ?? 0, hits: view.hitLines })
      const head = view.scope === undefined ? view.pattern : `${view.pattern} · ${view.scope}`
      return hits === undefined ? head : `${head} → ${hits}`
    }
    case 'web':
      return view.url ?? view.query
    case 'todo': {
      const done = view.items.filter((item) => item.status === 'completed').length
      return `${String(done)}/${String(view.items.length)}`
    }
    case 'question': {
      const first = view.items[0]
      const count = view.items.length
      const head = first?.question ?? ''
      const more = count > 1 ? ` +${String(count - 1)}` : ''
      return `${view.answered ? '' : ''}${head}${more}`
    }
    case 'command':
      return view.description ?? view.command
    case 'mutation':
      return `${MUTATION_VERB[view.operation]?.() ?? view.operation} · ${view.path}`
    case 'office':
      return view.format === undefined ? view.path : `${view.path} → ${view.format}`
    case 'image':
      return view.path
    case 'job':
      return view.waiting === true ? format('tool.jobWaiting', { jobId: view.jobId }) : view.jobId
    case 'skill':
      return view.skillName
    case 'goal':
      return view.detail === undefined ? view.action : `${view.action} · ${view.detail}`
    case 'code':
      if (view.description !== undefined) return view.description
      return view.language === undefined ? view.firstLine : `${view.language} · ${view.firstLine ?? ''}`
    case 'generic':
      return undefined
    // A new kind must decide what its one line says rather than print nothing.
    default:
      return undefined
  }
}
