import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { format, t as message } from '@/locale'

/**
 * Activity a step row stands for, named the way the desktop's `stepProcess`
 * labels name it.
 */
export type ProcessActivity =
  | 'thinking'
  | 'read'
  | 'readImage'
  | 'write'
  | 'search'
  | 'edit'
  | 'commands'
  | 'code'
  | 'webSearch'
  | 'webFetch'
  | 'subagents'
  | 'plan'
  | 'questions'
  | 'tools'

/** One collapsible step: its reasoning and tool rows behind a single header. */
export type NativeProcessRow = {
  activity: ProcessActivity
  /** Most activities this step performed, in first-seen order, capped at three. */
  activities: readonly ProcessActivity[]
  kind: 'process'
  /** Rows the disclosure reveals. */
  rows: readonly NativeConversationRow[]
  /**
   * Whether the row draws a step header. The desktop keeps the running Turn
   * flat: one header names the current activity, and the later steps of that
   * same Turn continue under it without a header of their own.
   */
  header?: false
  running: boolean
  rowKey: string
  sourceSeq?: number
  /** Header text: the live activity while running, the summary once settled. */
  title: string
}

/** A conversation row as the list renders it: a step group or a plain row. */
export type NativeDisplayRow = NativeProcessRow | NativeConversationRow

const RUNNING_KEYS = {
  thinking: 'process.runningThinking',
  read: 'process.runningRead',
  readImage: 'process.runningReadImage',
  write: 'process.runningWrite',
  search: 'process.runningSearch',
  edit: 'process.runningEdit',
  commands: 'process.runningCommands',
  code: 'process.runningCode',
  webSearch: 'process.runningWebSearch',
  webFetch: 'process.runningWebFetch',
  subagents: 'process.runningSubagents',
  plan: 'process.runningPlan',
  questions: 'process.runningQuestions',
  tools: 'process.runningTools',
} as const satisfies Record<ProcessActivity, string>

const DONE_KEYS = {
  thinking: 'process.doneThinking',
  read: 'process.doneRead',
  readImage: 'process.doneReadImage',
  write: 'process.doneWrite',
  search: 'process.doneSearch',
  edit: 'process.doneEdit',
  commands: 'process.doneCommands',
  code: 'process.doneCode',
  webSearch: 'process.doneWebSearch',
  webFetch: 'process.doneWebFetch',
  subagents: 'process.doneSubagents',
  plan: 'process.donePlan',
  questions: 'process.doneQuestions',
  tools: 'process.doneTools',
} as const satisfies Record<ProcessActivity, string>

/**
 * Names the activity one step row stands for.
 * @param row - Reasoning or tool row inside a step.
 * @returns The desktop's activity name for that row.
 */
export function processActivity(row: NativeConversationRow): ProcessActivity {
  if (row.kind === 'reasoning') return 'thinking'
  if (row.kind !== 'tool') return 'tools'
  // The desktop's own table, exact names first: a heuristic on the name alone put
  // `todo_write` under tools and `ask_user_question` under nothing at all.
  const name = row.toolName.toLowerCase()
  const exact: Partial<Record<string, ProcessActivity>> = {
    read: 'read',
    read_image: 'readImage',
    write: 'write',
    edit: 'edit',
    apply_patch: 'edit',
    bash: 'commands',
    pwsh: 'commands',
    exec_command: 'commands',
    write_stdin: 'commands',
    run_code: 'code',
    web_search: 'webSearch',
    web_fetch: 'webFetch',
    todo_write: 'plan',
    create_goal: 'plan',
    update_goal: 'plan',
    get_goal: 'plan',
    ask_user_question: 'questions',
    request_user_input: 'questions',
  }
  const named = exact[name] ?? (name === 'grep' || name === 'glob' || name.endsWith('_inspect') ? 'search' : undefined)
  if (named !== undefined) return named
  if (name === 'subagent' || name.startsWith('subagent_')) return 'subagents'
  if (name.startsWith('terminal_')) return 'commands'
  if (/image|screenshot/.test(name)) return 'readImage'
  if (/search/.test(name)) return /web|browser/.test(name) ? 'webSearch' : 'search'
  if (/fetch|url|browse/.test(name)) return 'webFetch'
  if (/grep|find|glob/.test(name)) return 'search'
  if (/bash|shell|terminal|command/.test(name)) return 'commands'
  if (/write|create/.test(name)) return 'write'
  if (/edit|patch|replace/.test(name)) return 'edit'
  if (/code|python|javascript|typescript/.test(name)) return 'code'
  if (/read|file|cat/.test(name)) return 'read'
  if (/web|http/.test(name)) return 'webFetch'
  return 'tools'
}

/** Whether a row belongs behind a step header. */
function isStepRow(row: NativeConversationRow): boolean {
  return row.kind === 'reasoning' || row.kind === 'tool'
}

/**
 * Summarises a settled step the way the desktop's `processTitle` does: the
 * distinct activities in first-seen order, phrased as completed actions.
 *
 * Two activities read as one clause (`运行了代码并执行了命令`) and a shared `已`
 * prefix is dropped from the second; three or more become a comma list. Beyond
 * three, the summary trails with 等 instead of growing a list.
 *
 * @param rows - Step rows behind the header.
 * @returns The settled header text.
 */
export function processTitle(rows: readonly NativeConversationRow[]): string {
  const activities: ProcessActivity[] = []
  for (const row of rows) {
    const activity = processActivity(row)
    if (!activities.includes(activity)) activities.push(activity)
  }
  const labels = activities.slice(0, 3).map((activity) => message(DONE_KEYS[activity] as 'process.doneThinking'))
  const first = labels[0]
  if (first === undefined) return message('process.doneThinking')
  // Labels are sentence-shaped, so a trailing one loses its capital in scripts that have one.
  const continuation = (label: string): string => label.charAt(0).toLowerCase() + label.slice(1)
  const second = labels[1]
  if (second === undefined) return first
  const prefix = message('process.sharedPrefix')
  if (labels.length === 2) {
    const shared = prefix !== '' && first.startsWith(prefix) && second.startsWith(prefix)
    return format('process.joinTwo', {
      first,
      second: continuation(shared ? second.slice(prefix.length) : second),
    })
  }
  const title = [first, ...labels.slice(1).map(continuation)].join(message('process.comma'))
  return activities.length > 3 ? format('process.more', { title }) : title
}

/** Names the activity the running Turn is performing right now. */
export function runningProcessTitle(rows: readonly NativeConversationRow[]): string {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index]
    if (row === undefined || !isStepRow(row)) continue
    return message(RUNNING_KEYS[processActivity(row)] as 'process.runningThinking')
  }
  return message('process.runningThinking')
}

/**
 * Groups each run of consecutive reasoning and tool rows into one collapsed step
 * header, matching the desktop conversation, where a step never prints one row
 * per call.
 *
 * The running Turn is flat, as the desktop's latest Turn is: its first run
 * carries one header naming the current activity, and later runs continue
 * underneath without repeating it.
 *
 * @param rows - Flat conversation rows.
 * @param options.running - Whether the session's newest turn is still running.
 * @param options.liveTurnStartSeq - Sequence where the running Turn begins, when it is open.
 * @param options.liveTitle - Live activity name for the running Turn's single header.
 * @returns Display rows with step groups replaced by a single header row.
 */
export function groupProcessRows(
  rows: readonly NativeConversationRow[],
  { liveTitle, liveTurnStartSeq, running }: { running: boolean; liveTurnStartSeq?: number; liveTitle?: string },
): NativeDisplayRow[] {
  const display: NativeDisplayRow[] = []
  let sawLiveHeader = false
  let index = 0
  while (index < rows.length) {
    const row = rows[index]
    if (row === undefined) break
    if (!isStepRow(row)) {
      display.push(row)
      index += 1
      continue
    }
    const members: NativeConversationRow[] = []
    while (index < rows.length) {
      const candidate = rows[index]
      if (candidate === undefined || !isStepRow(candidate)) break
      members.push(candidate)
      index += 1
    }
    const last = members[members.length - 1]
    const atTail = index >= rows.length
    const live = running && atTail
    const firstSeq = members[0]?.sourceSeq
    const inLiveTurn = liveTurnStartSeq !== undefined && firstSeq !== undefined && firstSeq >= liveTurnStartSeq
    const continueLiveTurn = inLiveTurn && sawLiveHeader
    const activity = last === undefined ? 'thinking' : processActivity(last)
    const activities: ProcessActivity[] = []
    for (const member of members) {
      const seen = processActivity(member)
      if (!activities.includes(seen)) activities.push(seen)
    }
    const firstRow = members[0]
    if (inLiveTurn) sawLiveHeader = true
    display.push({
      activity,
      activities,
      kind: 'process',
      rows: members,
      // Only the group still taking rows is running; earlier groups of the live Turn
      // have finished their own work and read as done, the way the desktop labels them.
      running: live,
      ...(continueLiveTurn ? { header: false as const } : {}),
      rowKey: `process:${firstRow?.rowKey ?? firstRow?.sourceSeq ?? index}`,
      ...(firstRow?.sourceSeq === undefined ? {} : { sourceSeq: firstRow.sourceSeq }),
      title: live ? (liveTitle ?? message(RUNNING_KEYS[activity] as 'process.runningThinking')) : processTitle(members),
    })
  }
  return display
}
