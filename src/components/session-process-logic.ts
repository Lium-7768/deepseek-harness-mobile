import type { ChatPresentationPolicy } from '@/components/chat-presentation-policy'
import { isHiddenReasoning, latestReasoningDetail, normalizeLiveDetail } from '@/components/reasoning-text'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import type {
  NativeDisplayRow,
  NativeProcessRow,
  ProcessActivity,
  RunningProcessActivity,
  TurnSpan,
} from '@/components/conversation-types'
import { format, t as message } from '@/locale'

export type { NativeDisplayRow, NativeProcessRow, ProcessActivity, RunningProcessActivity }

export interface ProcessActivityCount {
  readonly kind: Exclude<ProcessActivity, 'thinking'>
  readonly count: number
}

export interface ProcessActivitySummary {
  readonly counts: readonly ProcessActivityCount[]
  readonly running?: RunningProcessActivity
  readonly runningDetail: string
  readonly preparing?: true
}

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
  context: 'process.runningThinking',
} as const satisfies Record<ProcessActivity, string>

const PREPARE_KEYS = {
  read: 'process.prepareRead',
  readImage: 'process.prepareReadImage',
  write: 'process.prepareWrite',
  search: 'process.prepareSearch',
  edit: 'process.prepareEdit',
  commands: 'process.prepareCommands',
  code: 'process.prepareCode',
  webSearch: 'process.prepareWebSearch',
  webFetch: 'process.prepareWebFetch',
  subagents: 'process.prepareSubagents',
  plan: 'process.preparePlan',
  questions: 'process.prepareQuestions',
  tools: 'process.prepareTools',
} as const satisfies Record<RunningProcessActivity, string>

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
  context: 'process.doneContext',
} as const satisfies Record<ProcessActivity, string>

/** Ordered detail keys matching desktop `process-activity.ts` `LIVE_TOOL_DETAIL_KEYS`. */
const LIVE_TOOL_DETAIL_KEYS = [
  'title',
  'description',
  'objective',
  'task',
  'task_name',
  'name',
  'question',
  'questions',
  'prompt',
  'message',
  'command',
  'cmd',
  'queries',
  'query',
  'pattern',
  'url',
  'uri',
  'file_path',
  'path',
  'target',
  'action',
  'status',
] as const

function toolActivity(toolName: string): RunningProcessActivity {
  const name = toolName.toLowerCase()
  const exact: Partial<Record<string, RunningProcessActivity>> = {
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
    cua_run_code: 'code',
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

/**
 * Names the activity one step row stands for.
 * @param row - Reasoning, context, or tool row inside a step.
 * @returns The desktop activity name for that row.
 */
export function processActivity(row: NativeConversationRow): ProcessActivity {
  if (row.kind === 'reasoning') return 'thinking'
  if (row.kind === 'context') return 'context'
  if (row.kind !== 'tool') return 'tools'
  return toolActivity(row.toolName)
}

/** Whether a row joins a desktop step process run (`groupTree === undefined`). */
export function isStepRow(row: NativeConversationRow): boolean {
  return (
    row.kind === 'reasoning' ||
    row.kind === 'tool' ||
    row.kind === 'context' ||
    row.kind === 'command' ||
    row.kind === 'compaction'
  )
}

function normalizeValueDetail(value: unknown): string {
  if (typeof value === 'string') return normalizeLiveDetail(value)
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return normalizeLiveDetail(value.join(', '))
  }
  return ''
}

function questionDetail(value: unknown): string {
  if (!Array.isArray(value)) return ''
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue
    const detail = normalizeValueDetail((item as Record<string, unknown>).question)
    if (detail !== '') return detail
  }
  return ''
}

function liveToolDetail(toolName: string, toolInput: string | undefined): string {
  if (toolInput !== undefined && toolInput.trim() !== '') {
    try {
      const parsed = JSON.parse(toolInput) as unknown
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>
        for (const key of LIVE_TOOL_DETAIL_KEYS) {
          if (!(key in record)) continue
          const detail = key === 'questions' ? questionDetail(record[key]) : normalizeValueDetail(record[key])
          if (detail !== '') return detail
        }
      }
    } catch {
      // Non-JSON tool input falls through to the tool name below.
    }
  }
  return normalizeLiveDetail(toolName)
}

/**
 * Ranks tool categories by distinct call count (ties broken by first appearance),
 * matching desktop `process-activity.ts`. Context-only groups report `context`;
 * reasoning and mixed context add no count when tools exist.
 */
export function summarizeProcessActivity(rows: readonly NativeConversationRow[]): ProcessActivitySummary {
  const counts = new Map<Exclude<ProcessActivity, 'thinking'>, number>()
  const seenCallIds = new Set<string>()
  let running: RunningProcessActivity | undefined
  let preparing = false
  let runningDetail = ''
  for (const row of rows) {
    if (row.kind !== 'tool') continue
    if (row.callId !== undefined) {
      if (seenCallIds.has(row.callId)) continue
      seenCallIds.add(row.callId)
    }
    const kind = toolActivity(row.toolName)
    counts.set(kind, (counts.get(kind) ?? 0) + 1)
    if (row.state === 'running') {
      running = kind
      preparing = row.preparing === true
      runningDetail =
        row.summary !== undefined && row.summary.trim() !== ''
          ? normalizeLiveDetail(row.summary)
          : liveToolDetail(row.toolName, row.toolInput)
    }
  }
  if (running === undefined) {
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const row = rows[index]
      if (row?.kind !== 'reasoning' || row.running !== true) continue
      const detail = latestReasoningDetail(row.text)
      if (detail !== '') {
        runningDetail = detail
        break
      }
    }
  }
  if (rows.length > 0 && rows.every((row) => row.kind === 'context')) {
    counts.set('context', rows.length)
  }
  const ranked: ProcessActivityCount[] = [...counts]
    .map(([kind, count]) => ({ kind, count }))
    .sort((left, right) => right.count - left.count)
  return {
    counts: ranked,
    ...(running === undefined ? {} : { running }),
    ...(preparing ? { preparing: true as const } : {}),
    runningDetail,
  }
}

/**
 * Summarises a settled step the way the desktop `step-process.ts` `processTitle` does:
 * top three tool/context categories ranked by call count descending, falling back to
 * `已完成分析` when only reasoning (or non-tool/non-context rows) ran.
 */
export function processTitle(rows: readonly NativeConversationRow[]): string {
  const summary = summarizeProcessActivity(rows)
  const labels = summary.counts.slice(0, 3).map(({ kind }) => message(DONE_KEYS[kind] as 'process.doneThinking'))
  const first = labels[0]
  if (first === undefined) return message('process.doneThinking')
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
  return summary.counts.length > 3 ? format('process.more', { title }) : title
}

/** Names the activity the running Turn is performing right now. */
function liveActivityLabel(activity: ProcessActivity, preparing: boolean): string {
  if (preparing) {
    const key = activity === 'thinking' || activity === 'context' ? 'tools' : activity
    return message(PREPARE_KEYS[key] as 'process.prepareTools')
  }
  return message(RUNNING_KEYS[activity] as 'process.runningThinking')
}

export function runningProcessTitle(
  rows: readonly NativeConversationRow[],
  options: { liveDetail?: boolean } = {},
): string {
  const summary = summarizeProcessActivity(rows)
  const activity: ProcessActivity = summary.running ?? 'thinking'
  const label = liveActivityLabel(activity, summary.preparing === true)
  if (options.liveDetail === true && summary.runningDetail !== '') {
    return format('process.liveWithDetail', { detail: summary.runningDetail, label })
  }
  return label
}

function turnOfSeq(spans: readonly TurnSpan[] | undefined, seq: number | undefined): number | undefined {
  if (spans === undefined || seq === undefined) return undefined
  for (const span of spans) {
    if (seq >= span.startSeq && seq <= span.endSeq) return span.turn
  }
  return undefined
}

/**
 * Groups each consecutive run of step rows (`reasoning`, `tool`, `context`, `command`,
 * `compaction`) within one Turn into a `NativeProcessRow`, matching desktop `process-groups.ts`.
 */
export function groupProcessRows(
  rows: readonly NativeConversationRow[],
  {
    deferredTurn,
    liveTitle,
    liveTurnStartSeq,
    policy,
    running,
    spans,
  }: {
    running: boolean
    liveTurnStartSeq?: number
    liveTitle?: string
    policy?: ChatPresentationPolicy
    spans?: readonly TurnSpan[]
    deferredTurn?: number
  },
): NativeDisplayRow[] {
  const display: NativeDisplayRow[] = []
  let sawLiveHeader = false
  let index = 0
  while (index < rows.length) {
    const row = rows[index]
    if (row === undefined) break
    if (row.kind === 'reasoning' && isHiddenReasoning(row.text)) {
      index += 1
      continue
    }
    if (!isStepRow(row)) {
      display.push(row)
      index += 1
      continue
    }
    const runTurn = turnOfSeq(spans, row.sourceSeq)
    const members: NativeConversationRow[] = []
    while (index < rows.length) {
      const candidate = rows[index]
      if (candidate === undefined) break
      if (candidate.kind === 'reasoning' && isHiddenReasoning(candidate.text)) {
        index += 1
        continue
      }
      if (!isStepRow(candidate)) break
      const candidateTurn = turnOfSeq(spans, candidate.sourceSeq)
      if (runTurn !== undefined && candidateTurn !== undefined && candidateTurn !== runTurn) break
      members.push(candidate)
      index += 1
    }
    if (members.length === 0) continue
    const atTail = index >= rows.length
    const runSpan = runTurn === undefined ? undefined : spans?.find((span) => span.turn === runTurn)
    const runTurnSettled = runSpan !== undefined && runSpan.endSeq !== Number.MAX_SAFE_INTEGER
    const live = running && atTail && !runTurnSettled
    const firstRow = members[0]
    const firstSeq = firstRow?.sourceSeq
    const inLiveTurn = liveTurnStartSeq !== undefined && firstSeq !== undefined && firstSeq >= liveTurnStartSeq
    const isDeferred = deferredTurn !== undefined && runTurn !== undefined && runTurn === deferredTurn
    const summary = summarizeProcessActivity(members)
    const activity: ProcessActivity = live ? (summary.running ?? 'thinking') : (summary.counts[0]?.kind ?? 'thinking')
    const activities: ProcessActivity[] = summary.counts.map((entry) => entry.kind)
    const flat =
      policy?.stepGrouping === 'none' || (policy?.stepGrouping === 'history' && (inLiveTurn || isDeferred || live))
    const continueLiveTurn = policy === undefined && inLiveTurn && sawLiveHeader
    if (inLiveTurn) sawLiveHeader = true
    const liveBaseLabel = liveActivityLabel(activity, summary.preparing === true)
    const liveDetail = live && policy?.liveProcessDetail === true ? summary.runningDetail : ''
    const computedLiveTitle =
      liveTitle ??
      (liveDetail === ''
        ? liveBaseLabel
        : format('process.liveWithDetail', { detail: liveDetail, label: liveBaseLabel }))
    display.push({
      activity,
      activities,
      kind: 'process',
      rows: members,
      running: live,
      ...(live && summary.runningDetail !== '' ? { runningDetail: summary.runningDetail } : {}),
      ...(flat ? { flat: true } : {}),
      ...(continueLiveTurn ? { header: false as const } : {}),
      rowKey: `process:${firstRow?.rowKey ?? firstRow?.sourceSeq ?? index}`,
      ...(firstRow?.sourceSeq === undefined ? {} : { sourceSeq: firstRow.sourceSeq }),
      title: live ? computedLiveTitle : processTitle(members),
    })
  }
  return display
}
