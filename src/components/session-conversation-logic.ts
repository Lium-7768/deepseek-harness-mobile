import { t as message } from '@/locale'
import type { SharedEventItem } from '@/shared/dsh-presentation'

export type NativeConversationRow =
  | {
      kind: 'user' | 'assistant'
      text: string
      rowKey?: string
      sourceSeq?: number
      time?: number
    }
  | {
      kind: 'reasoning'
      text: string
      rowKey?: string
      sourceSeq?: number
    }
  | {
      callId?: string
      kind: 'tool'
      output?: string
      rowKey?: string
      sourceSeq?: number
      state: 'completed' | 'failed' | 'running'
      summary?: string
      toolInput?: string
      toolName: string
    }
  | {
      delayMs: number
      failureMessage: string
      kind: 'retry'
      maxRetries: number
      retry: number
      rowKey?: string
      sourceSeq?: number
    }
  | {
      code?: string
      kind: 'turn-error'
      message: string
      rowKey?: string
      sourceSeq?: number
    }
  | {
      commandId?: string
      kind: 'command'
      name: string
      state: 'running' | 'success' | 'error'
      text?: string
      rowKey?: string
      sourceSeq?: number
    }
  | {
      kind: 'turn-max-tokens'
      rowKey?: string
      sourceSeq?: number
    }
  | {
      kind: 'compaction'
      shadowedItemCount?: number
      shadowedTokenCount?: number
      summary: string
      rowKey?: string
      sourceSeq?: number
    }
  | {
      /** Files this turn produced for the reader, as the Host recorded them. */
      files: readonly { path: string; description?: string }[]
      kind: 'deliverables'
      rowKey?: string
      sourceSeq?: number
    }
  | {
      /** What started this Turn, when it was not the reader typing. */
      kind: 'turn-trigger'
      trigger: NativeTurnTrigger
      /** The waking notification's own text, shown on demand. */
      text?: string
      rowKey?: string
      sourceSeq?: number
    }

/**
 * A non-human message that began a Turn.
 *
 * The desktop draws one of these above the Turn's disclosure so the reader knows
 * why the assistant spoke. Injection bookkeeping (`time-context`, `runtime-context`,
 * `skill-catalog`, instructions, reminders) is deliberately absent: it is not a
 * trigger, and printing it would bury the turns that were.
 */
export type NativeTurnTrigger =
  'agent' | 'approval' | 'continue' | 'goal' | 'job' | 'schedule' | 'subagent' | 'team' | 'webhook'

type EventRecord = Record<string, unknown>
type ContentBlock = { type?: unknown; text?: unknown }

/**
 * Projects desktop durable session events into ordered native conversation rows.
 *
 * The projection deliberately preserves the same durable distinctions the desktop
 * conversation uses: assistant prose and reasoning are separate, a tool call is
 * updated by its correlated result, and model retries remain expandable rows.
 *
 * @param items - Gateway history and SSE events ordered by durable sequence.
 * @returns Native rows derived only from desktop session events.
 */
export function projectNativeConversationRows(items: readonly SharedEventItem[]): NativeConversationRow[] {
  const orderedItems = [...items].sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0))
  const settledAssistantSteps = new Set(
    orderedItems.flatMap((item) => {
      if (stringField(item.event.type) !== 'assistant/message') return []
      const key = eventStepKey(recordField(item.event.data) ?? item.event)
      return key === undefined ? [] : [key]
    }),
  )
  const rows: NativeConversationRow[] = []
  const toolRowByCallId = new Map<string, number>()
  const commandRowByCommandId = new Map<string, number>()
  const streamingRowByBlock = new Map<string, number>()
  for (const item of orderedItems) {
    const event = item.event
    const type = stringField(event.type)
    const data = recordField(event.data) ?? event
    const sourceSeq = item.seq
    if (type === 'assistant/chunk') {
      const stepKey = eventStepKey(data)
      const chunk = recordField(data.chunk)
      const chunkType = stringField(chunk?.type)
      const index = numberField(chunk?.index)
      const text = stringField(chunk?.text)
      if (
        stepKey !== undefined &&
        !settledAssistantSteps.has(stepKey) &&
        index !== undefined &&
        text !== undefined &&
        (chunkType === 'reasoning-delta' || chunkType === 'text-delta')
      ) {
        const kind = chunkType === 'reasoning-delta' ? 'reasoning' : 'assistant'
        const blockKey = `${stepKey}:${kind}:${index}`
        const rowIndex = streamingRowByBlock.get(blockKey)
        if (rowIndex !== undefined) {
          const existing = rows[rowIndex]
          if (existing?.kind === kind) {
            rows[rowIndex] = { ...existing, text: `${existing.text}${text}` }
            continue
          }
        }
        rows.push({ kind, rowKey: `stream:${blockKey}`, text, ...(sourceSeq === undefined ? {} : { sourceSeq }) })
        streamingRowByBlock.set(blockKey, rows.length - 1)
      }
      continue
    }
    if (type === 'user/message') {
      const trigger = turnTriggerOf(data)
      if (trigger !== undefined) {
        const text = textFromMessage(data)
        rows.push({
          kind: 'turn-trigger',
          trigger,
          ...(text === undefined ? {} : { text }),
          ...(sourceSeq === undefined ? {} : { sourceSeq }),
        })
        continue
      }
      // Only a human turn is a user bubble. Runtime context, the skill catalog, the
      // time snapshot, agent instructions, and compaction checkpoints are logged as
      // user-role messages too, and the desktop renders them as context, not as what
      // the reader typed.
      const text = humanUserText(data)
      if (text)
        rows.push({ kind: 'user', text, ...(sourceSeq === undefined ? {} : { sourceSeq }), ...eventTime(event) })
      continue
    }
    if (type === 'assistant/message') {
      for (const block of messageBlocks(data)) {
        if (block.type === 'reasoning' && typeof block.text === 'string' && block.text.trim()) {
          rows.push({ kind: 'reasoning', text: block.text.trim(), ...(sourceSeq === undefined ? {} : { sourceSeq }) })
        }
      }
      const text = messageBlocks(data)
        .flatMap((block) => (block.type === 'text' && typeof block.text === 'string' ? [block.text] : []))
        .join('')
        .trim()
      if (text)
        rows.push({ kind: 'assistant', text, ...(sourceSeq === undefined ? {} : { sourceSeq }), ...eventTime(event) })
      continue
    }
    if (type === 'tool/call') {
      const callId = stringField(data.callId)
      const toolName = stringField(data.name) ?? message('session.toolCall')
      const row: NativeConversationRow = {
        kind: 'tool',
        state: 'running',
        toolName,
        ...(callId === undefined ? {} : { callId }),
        ...(fieldText(data.arguments) === undefined ? {} : { toolInput: fieldText(data.arguments) }),
        ...(fieldText(data.description) === undefined ? {} : { summary: fieldText(data.description) }),
        ...(sourceSeq === undefined ? {} : { sourceSeq }),
      }
      rows.push(row)
      if (callId !== undefined) toolRowByCallId.set(callId, rows.length - 1)
      continue
    }
    if (type === 'tool/result') {
      const result = toolResult(data)
      if (result.callId !== undefined) {
        const rowIndex = toolRowByCallId.get(result.callId)
        if (rowIndex !== undefined) {
          const existing = rows[rowIndex]
          if (existing?.kind === 'tool') {
            rows[rowIndex] = {
              ...existing,
              state: result.failed ? 'failed' : 'completed',
              ...(result.output === undefined ? {} : { output: result.output }),
            }
            continue
          }
        }
      }
      rows.push({
        kind: 'tool',
        state: result.failed ? 'failed' : 'completed',
        toolName: message('session.toolResult'),
        ...(result.output === undefined ? {} : { output: result.output }),
        ...(sourceSeq === undefined ? {} : { sourceSeq }),
      })
      continue
    }
    if (type === 'llm/retry') {
      const failure = recordField(data.failure)
      const retry = numberField(data.retry) ?? 1
      rows.push({
        delayMs: numberField(data.delayMs) ?? 0,
        failureMessage: stringField(failure?.message) ?? message('session.modelRequestFailed'),
        kind: 'retry',
        maxRetries: numberField(data.maxRetries) ?? retry,
        retry,
        ...(sourceSeq === undefined ? {} : { sourceSeq }),
      })
      continue
    }
    if (type === 'command/run') {
      const commandId = stringField(data.commandId)
      rows.push({
        ...(commandId === undefined ? {} : { commandId }),
        kind: 'command',
        name: stringField(data.name) ?? message('session.command'),
        state: 'running',
        ...(stringField(data.source) === undefined ? {} : { text: stringField(data.source) }),
        ...(sourceSeq === undefined ? {} : { sourceSeq }),
      })
      if (commandId !== undefined) commandRowByCommandId.set(commandId, rows.length - 1)
      continue
    }
    if (type === 'command/done') {
      const commandId = stringField(data.commandId)
      if (commandId !== undefined) {
        const rowIndex = commandRowByCommandId.get(commandId)
        if (rowIndex !== undefined) {
          const existing = rows[rowIndex]
          if (existing?.kind === 'command') {
            rows[rowIndex] = {
              ...existing,
              state: stringField(data.kind) === 'error' ? 'error' : 'success',
              ...(stringField(data.text) === undefined ? {} : { text: stringField(data.text) }),
            }
            continue
          }
        }
      }
      rows.push({
        ...(commandId === undefined ? {} : { commandId }),
        kind: 'command',
        name: message('session.commandResult'),
        state: stringField(data.kind) === 'error' ? 'error' : 'success',
        ...(stringField(data.text) === undefined ? {} : { text: stringField(data.text) }),
        ...(sourceSeq === undefined ? {} : { sourceSeq }),
      })
      continue
    }
    if (type === 'deliverables/presented') {
      const files = presentedFiles(data)
      if (files.length > 0)
        rows.push({ files, kind: 'deliverables', ...(sourceSeq === undefined ? {} : { sourceSeq }) })
      continue
    }
    if (type === 'compaction/summary') {
      rows.push({
        kind: 'compaction',
        summary: compactSummaryText(data),
        ...(summaryBlockCount(data) === undefined ? {} : { shadowedItemCount: summaryBlockCount(data) }),
        ...(numberField(data.shadowedTokenCount) === undefined
          ? {}
          : { shadowedTokenCount: numberField(data.shadowedTokenCount) }),
        ...(sourceSeq === undefined ? {} : { sourceSeq }),
      })
      continue
    }
    if (type === 'turn/end') {
      const reason = recordField(data.reason)
      const kind = stringField(reason?.kind)
      if (kind === 'error') {
        const failure = displayFailure(recordField(reason?.error))
        rows.push({
          ...(failure.code === undefined ? {} : { code: failure.code }),
          kind: 'turn-error',
          message: failure.message,
          ...(sourceSeq === undefined ? {} : { sourceSeq }),
        })
      } else if (kind === 'max-tokens') {
        rows.push({
          kind: 'turn-max-tokens',
          ...(sourceSeq === undefined ? {} : { sourceSeq }),
        })
      }
      continue
    }
  }
  return rows
}

/**
 * Finds the durable start time of the currently open turn for the native running footer.
 *
 * @param items - Ordered session events.
 * @returns The latest unclosed turn start time, if any.
 */
export function activeTurnStartedAt(items: readonly SharedEventItem[]): number | undefined {
  const openTurns = new Map<number, number>()
  for (const item of items) {
    const type = stringField(item.event.type)
    const data = recordField(item.event.data) ?? item.event
    const turn = numberField(data.turn)
    if (turn === undefined) continue
    if (type === 'turn/start') {
      const time = numberField(item.event.time)
      if (time !== undefined) openTurns.set(turn, time)
    } else if (type === 'turn/end') openTurns.delete(turn)
  }
  return [...openTurns.values()].at(-1)
}

/**
 * Mirrors the desktop displayFailure mapping for turn-level LLM failures.
 *
 * Provider AUTH messages may echo a masked or partially preserved credential;
 * keep the raw diagnostic in the Session log, but never retain it in UI state.
 *
 * @param failure - The `LlmFailure` carried by `turn/end` reason.error.
 * @returns A code and a model-safe message for the turn error row.
 */
function displayFailure(failure: unknown): { code?: string; message: string } {
  if (failure === null || typeof failure !== 'object') return { message: String(failure) }
  const record = failure as { code?: unknown; message?: unknown }
  const code = typeof record.code === 'string' ? record.code : undefined
  if (code === 'AUTH') return { code, message: '' }
  return {
    ...(code === undefined ? {} : { code }),
    message: typeof record.message === 'string' ? record.message : JSON.stringify(failure),
  }
}

function compactSummaryText(data: EventRecord): string {
  const blocks = Array.isArray(data.summary)
    ? data.summary.filter(
        (block): block is ContentBlock => block !== null && typeof block === 'object' && !Array.isArray(block),
      )
    : []
  return blocks
    .flatMap((block) => (block.type === 'text' && typeof block.text === 'string' ? [block.text] : []))
    .join('')
}

function summaryBlockCount(data: EventRecord): number | undefined {
  const shadowedSeqs = data.shadowedSeqs
  return Array.isArray(shadowedSeqs) ? shadowedSeqs.length : undefined
}

function eventStepKey(data: EventRecord): string | undefined {
  const turn = numberField(data.turn)
  const step = numberField(data.step)
  return turn === undefined || step === undefined ? undefined : `${turn}:${step}`
}

function messageBlocks(data: EventRecord): ContentBlock[] {
  // A settled assistant message nests the role payload under `message`; a durable
  // `user/message` carries `content` on its data directly. Reading only the nested
  // form dropped every human turn from the conversation.
  const message = recordField(data.message)
  const content = message === undefined ? data.content : message.content
  return Array.isArray(content)
    ? content.filter(
        (block): block is ContentBlock => block !== null && typeof block === 'object' && !Array.isArray(block),
      )
    : []
}

/**
 * Classifies a user-role message that a machine sent to wake the agent.
 *
 * @param data - The message payload.
 * @returns The trigger family, or undefined for a message the reader typed or one
 * that only carries injection bookkeeping.
 */
function turnTriggerOf(data: EventRecord): NativeTurnTrigger | undefined {
  const source = recordField(data.source)
  const kind = stringField(source?.kind)
  switch (kind) {
    case 'goal':
      return 'goal'
    case 'schedule':
      return 'schedule'
    case 'subagent-settled':
      return 'subagent'
    case 'tool-jobs':
      return 'job'
    case 'agent-message':
      return 'agent'
    case 'team-message':
      return 'team'
    case 'webhook':
      return 'webhook'
    case 'user-approval':
      return 'approval'
    case 'retry':
      return 'continue'
    default:
      return undefined
  }
}

/**
 * Names one waking trigger for the transcript and the exported log.
 *
 * @param trigger - The classified family.
 * @returns The localized label.
 */
export function triggerText(trigger: NativeTurnTrigger): string {
  switch (trigger) {
    case 'agent':
      return message('conversation.triggerAgent')
    case 'approval':
      return message('conversation.triggerApproval')
    case 'continue':
      return message('conversation.triggerContinue')
    case 'goal':
      return message('conversation.triggerGoal')
    case 'job':
      return message('conversation.triggerJob')
    case 'schedule':
      return message('conversation.triggerSchedule')
    case 'subagent':
      return message('conversation.triggerSubagent')
    case 'team':
      return message('conversation.triggerTeam')
    case 'webhook':
      return message('conversation.triggerWebhook')
  }
}

function humanUserText(data: EventRecord): string | undefined {
  const source = recordField(data.source)
  const kind = stringField(source?.kind)
  if (kind !== undefined && kind !== 'user') return undefined
  return textFromMessage(data)
}

function textFromMessage(data: EventRecord): string | undefined {
  const text = messageBlocks(data)
    .flatMap((block) => (block.type === 'text' && typeof block.text === 'string' ? [block.text] : []))
    .join('')
    .trim()
  return text || undefined
}

/**
 * Reads the files a `deliverables/presented` event handed the reader.
 *
 * @param data - The event payload.
 * @returns One entry per path the Host recorded, dropping anything unreadable.
 */
function presentedFiles(data: EventRecord): { path: string; description?: string }[] {
  const files = data.files
  if (!Array.isArray(files)) return []
  return files.flatMap((value) => {
    const file = recordField(value)
    const path = stringField(file?.path)
    if (path === undefined || path === '') return []
    const description = stringField(file?.description)?.trim()
    return [{ path, ...(description === undefined || description === '' ? {} : { description }) }]
  })
}

function toolResult(data: EventRecord): { callId?: string; failed: boolean; output?: string } {
  const message = recordField(data.message)
  const source = recordField(message?.source)
  const block = Array.isArray(message?.content)
    ? message.content.find((value) => recordField(value)?.type === 'tool-result')
    : undefined
  const result = recordField(block)
  const content = Array.isArray(result?.content) ? result.content : []
  const output = content
    .flatMap((value) => {
      const row = recordField(value)
      return row?.type === 'text' && typeof row.text === 'string' ? [row.text] : []
    })
    .join('\n')
    .trim()
  return {
    ...(stringField(source?.callId) === undefined ? {} : { callId: stringField(source?.callId) }),
    failed: result?.isError === true,
    ...(output ? { output } : {}),
  }
}

function eventTime(event: EventRecord): { time?: number } {
  const time = numberField(event.time)
  return time === undefined ? {} : { time }
}

function recordField(value: unknown): EventRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as EventRecord) : undefined
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberField(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function fieldText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value === undefined || value === null || typeof value !== 'object') return undefined
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return undefined
  }
}

/** Argument fields a tool row shows, in the order the desktop prefers them. */
const TOOL_ARGUMENT_FIELDS = [
  'command',
  'file_path',
  'path',
  'pattern',
  'query',
  'url',
  'prompt',
  'description',
] as const

/**
 * One-line argument for a tool row: what the call acted on.
 *
 * The desktop prints the call's own argument after the verb (`运行命令 · ls -la`,
 * `读取图片 · /tmp/shot.png`), not the tool's internal name, so the row keeps
 * meaning when the projection carries no description.
 *
 * @param toolInput - The call's raw `arguments` text, usually a JSON object.
 * @returns The preferred argument, or the raw input when it is not JSON.
 */
export function toolArgument(toolInput: string | undefined): string | undefined {
  if (toolInput === undefined) return undefined
  const raw = toolInput.trim()
  if (raw === '') return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return collapseLine(raw)
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return collapseLine(raw)
  const record = parsed as Record<string, unknown>
  for (const field of TOOL_ARGUMENT_FIELDS) {
    const value = record[field]
    if (typeof value === 'string' && value.trim()) return collapseLine(value)
  }
  // Any other call shape: the first string it carries still names what it did.
  for (const value of Object.values(record)) {
    if (typeof value === 'string' && value.trim()) return collapseLine(value)
  }
  // Nothing happened in words (an empty or numeric-only argument object), so
  // the row falls back to the tool name rather than printing JSON at the reader.
  return undefined
}

/** Squeeze an argument onto one line so a row's single line stays informative. */
function collapseLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
