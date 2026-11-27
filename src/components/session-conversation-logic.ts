import { format, t as message } from '@/locale'
import type { SharedEventItem } from '@/shared/dsh-presentation'

/** Producer-declared context presentation forms supported by both desktop and mobile. */
export type KnownContextForm = 'instructions' | 'catalog' | 'snapshot' | 'notice' | 'relay' | 'recall'

/** Structured tool-set changes carried by a logged context injection. */
export type ContextToolChanges = {
  readonly added: readonly string[]
  readonly removed: readonly string[]
  readonly single?: {
    readonly type: 'tool-addition' | 'tool-removal'
    readonly toolName: string
  }
}

export type NativeConversationRow =
  | {
      kind: 'user' | 'assistant'
      text: string
      rowKey?: string
      sourceSeq?: number
      time?: number
      /** Assistant only: the Turn's token accounting, when the Host reported it. */
      usage?: TurnTokenUsage
      /** The Turn this message belongs to, for the turn rail. */
      turn?: number
    }
  | {
      kind: 'reasoning'
      text: string
      /** True while streaming deltas arrive before the durable assistant message settles. */
      running?: boolean
      rowKey?: string
      sourceSeq?: number
    }
  | {
      callId?: string
      kind: 'tool'
      output?: string
      /** True while tool-call arguments are still streaming before dispatch. */
      preparing?: true
      rowKey?: string
      sourceSeq?: number
      state: 'completed' | 'failed' | 'running'
      summary?: string
      toolInput?: string
      /** The call's own metadata: a file mutation's path and diff live here. */
      toolMeta?: Readonly<Record<string, unknown>>
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
      /**
       * Logged context the model received: a time snapshot, the runtime context, the
       * skill catalog, project instructions, a developer message, or a cross-session recall.
       * Desktop draws these as `上下文注入 · <producer>` disclosures inside step groups.
       */
      kind: 'context'
      /** The source that produced it, e.g. `time-context` or recalled session labels. */
      producer: string
      /** Distinguishes cross-session recall and system prompts from ordinary context injections. */
      role?: 'inject' | 'recall' | 'system'
      /** Producer-declared structured presentation form; omitted renders the opaque body. */
      form?: KnownContextForm
      /** Raw durable source record for structured context-body presentation and opaque fields. */
      source?: Readonly<Record<string, unknown>>
      /** Raw durable content blocks in model order, including unknown merge-extensible blocks. */
      contentBlocks?: readonly Readonly<Record<string, unknown>>[]
      /** Structured tool-set changes when every content block is a tool addition or removal. */
      toolChanges?: ContextToolChanges
      /** A change's own heading, when the source is not a plain injection. */
      title?: string
      /** Producer-declared one-line summary, when the source carries one. */
      summary?: string
      text: string
      rowKey?: string
      sourceSeq?: number
    }
  | {
      /** What started this Turn, when it was not the reader typing. */
      kind: 'turn-trigger'
      trigger: NativeTurnTrigger
      /** The waking notification's own text, shown on demand. */
      text?: string
      /** Raw durable source record for notice-body rendering. */
      source?: Readonly<Record<string, unknown>>
      /** Raw durable content blocks in model order. */
      contentBlocks?: readonly Readonly<Record<string, unknown>>[]
      /** Recorded event timestamp for the trigger card header. */
      time?: number
      rowKey?: string
      sourceSeq?: number
    }

/** A non-human message that began a Turn. */
export type NativeTurnTrigger =
  | 'agent'
  | 'approval'
  | 'continue'
  | 'github'
  | 'goal'
  | 'job'
  | 'plugin'
  | 'schedule'
  | 'subagent'
  | 'subagentAborted'
  | 'subagentCompleted'
  | 'subagentError'
  | 'subagentMaxTokens'
  | 'subagentRefusal'
  | 'subagentUnknown'
  | 'team'
  | 'webhook'

type EventRecord = Record<string, unknown>
type ContentBlock = Record<string, unknown> & { type?: unknown; text?: unknown; toolName?: unknown }

const KNOWN_CONTEXT_FORMS: ReadonlySet<string> = new Set([
  'instructions',
  'catalog',
  'snapshot',
  'notice',
  'relay',
  'recall',
])

/**
 * Projects desktop durable session events into ordered native conversation rows.
 *
 * The projection deliberately preserves the same durable distinctions the desktop
 * conversation uses: assistant prose and reasoning are separate, a tool call is
 * updated by its correlated result, developer/context injections retain their
 * structured form and source metadata, and model retries remain expandable rows.
 *
 * @param items - Gateway history and SSE events ordered by durable sequence.
 * @returns Native rows derived only from desktop session events.
 */
function isSortedBySeq(items: readonly SharedEventItem[]): boolean {
  for (let i = 1; i < items.length; i += 1) {
    if ((items[i - 1]?.seq ?? 0) > (items[i]?.seq ?? 0)) return false
  }
  return true
}

export function projectNativeConversationRows(items: readonly SharedEventItem[]): NativeConversationRow[] {
  const orderedItems = isSortedBySeq(items)
    ? items
    : [...items].sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0))
  const turnUsage = turnUsageByTurn(orderedItems)
  const rows: NativeConversationRow[] = []
  const removedIndices = new Set<number>()
  const toolRowByCallId = new Map<string, number>()
  const runningToolIndicesByTurn = new Map<number, number[]>()
  const recordTurnTool = (turn: number | undefined, rowIndex: number): void => {
    if (turn === undefined) return
    const list = runningToolIndicesByTurn.get(turn)
    if (list === undefined) runningToolIndicesByTurn.set(turn, [rowIndex])
    else list.push(rowIndex)
  }
  const commandRowByCommandId = new Map<string, number>()
  const streamingRowByBlock = new Map<string, number>()
  const streamingRowsByStepKind = new Map<string, number[]>()
  const streamingReasoningIndicesByTurn = new Map<number, number[]>()
  const streamingReasoningByStep = new Map<string, Array<{ blockIndex: number; rowIndex: number }>>()
  const settleStepReasoning = (stepKey: string | undefined, keepBlockIndex?: number): void => {
    if (stepKey === undefined) return
    const entries = streamingReasoningByStep.get(stepKey)
    if (entries === undefined) return
    const remaining: Array<{ blockIndex: number; rowIndex: number }> = []
    for (const entry of entries) {
      if (keepBlockIndex !== undefined && entry.blockIndex === keepBlockIndex) {
        remaining.push(entry)
        continue
      }
      const existing = rows[entry.rowIndex]
      if (existing?.kind === 'reasoning' && existing.running === true) {
        const { running: _running, ...settledReasoning } = existing
        rows[entry.rowIndex] = settledReasoning
      }
    }
    if (remaining.length === 0) streamingReasoningByStep.delete(stepKey)
    else streamingReasoningByStep.set(stepKey, remaining)
  }
  // The first row each step streamed for a kind, so its settled message replaces that row
  // in place instead of appending a second copy at the end of the Turn.
  const settledRowByStep = new Map<string, number>()
  // Consecutive retries of one step fold into a single row, matching desktop `retry.ts`.
  const retryRowByStep = new Map<string, number>()
  let sawSystemPrompt = false
  for (const item of orderedItems) {
    const event = item.event
    const type = stringField(event.type)
    const data = recordField(event.data) ?? event
    const sourceSeq = item.seq
    if (type === 'system/message') {
      const text = textFromMessage(data)
      if (text !== undefined) {
        rows.push({
          kind: 'context',
          producer: 'system-prompt',
          role: 'system',
          title: message(sawSystemPrompt ? 'conversation.systemPromptUpdate' : 'conversation.systemPrompt'),
          text,
          ...(sourceSeq === undefined ? {} : { sourceSeq }),
        })
        sawSystemPrompt = true
      }
      continue
    }
    if (type === 'developer/message') {
      const nested = recordField(data.message) ?? data
      const context = contextRowOf(nested, sourceSeq, true)
      if (context !== undefined) rows.push(context)
      continue
    }
    if (type === 'assistant/chunk') {
      const stepKey = eventStepKey(data)
      const turn = numberField(data.turn)
      const chunk = recordField(data.chunk)
      const chunkType = stringField(chunk?.type)
      const index = numberField(chunk?.index)
      const text = typeof chunk?.text === 'string' && chunk.text.length > 0 ? chunk.text : undefined
      if (stepKey !== undefined && index !== undefined && chunkType !== 'reasoning-delta') {
        settleStepReasoning(stepKey)
      }
      if (chunkType === 'tool-call-delta') {
        settleStepReasoning(stepKey)
        const callId = stringField(chunk?.id)
        const delta = typeof chunk?.argumentsDelta === 'string' ? chunk.argumentsDelta : ''
        if (callId !== undefined) {
          const existingIndex = toolRowByCallId.get(callId)
          if (existingIndex !== undefined) {
            const existing = rows[existingIndex]
            if (existing?.kind === 'tool' && existing.preparing === true) {
              const nextInput = `${existing.toolInput ?? ''}` + delta
              rows[existingIndex] = { ...existing, ...(nextInput === '' ? {} : { toolInput: nextInput }) }
            }
          } else {
            const toolName = stringField(chunk?.name)
            if (toolName !== undefined) {
              rows.push({
                kind: 'tool',
                callId,
                preparing: true,
                state: 'running',
                toolName,
                ...(delta === '' ? {} : { toolInput: delta }),
                ...(sourceSeq === undefined ? {} : { sourceSeq }),
              })
              toolRowByCallId.set(callId, rows.length - 1)
              recordTurnTool(turn, rows.length - 1)
            }
          }
        }
        continue
      }
      if (chunkType === 'block-end') {
        const block = recordField(chunk?.block)
        if (stringField(block?.type) === 'tool-call') {
          const callId = stringField(block?.id)
          const existingIndex = callId === undefined ? undefined : toolRowByCallId.get(callId)
          if (existingIndex !== undefined) {
            const existing = rows[existingIndex]
            if (existing?.kind === 'tool' && existing.preparing === true) {
              const nextName = stringField(block?.name) ?? existing.toolName
              const nextArgs = fieldText(block?.arguments) ?? existing.toolInput
              rows[existingIndex] = {
                ...existing,
                toolName: nextName,
                ...(nextArgs === undefined ? {} : { toolInput: nextArgs }),
              }
            }
          }
        }
        continue
      }
      if (
        stepKey !== undefined &&
        index !== undefined &&
        text !== undefined &&
        (chunkType === 'reasoning-delta' || chunkType === 'text-delta')
      ) {
        const kind = chunkType === 'reasoning-delta' ? 'reasoning' : 'assistant'
        if (kind === 'reasoning') settleStepReasoning(stepKey, index)
        const blockKey = `${stepKey}:${kind}:${index}`
        const rowIndex = streamingRowByBlock.get(blockKey)
        if (rowIndex !== undefined) {
          const existing = rows[rowIndex]
          if (existing?.kind === kind) {
            rows[rowIndex] = { ...existing, text: `${existing.text}${text}` }
            continue
          }
        }
        const settledKey = `${stepKey}:${kind}`
        const rowKey = !settledRowByStep.has(settledKey) ? `step:${settledKey}` : `stream:${blockKey}`
        if (kind === 'reasoning') {
          rows.push({
            kind,
            rowKey,
            running: true,
            text,
            ...(sourceSeq === undefined ? {} : { sourceSeq }),
          })
          const stepList = streamingReasoningByStep.get(stepKey)
          if (stepList === undefined)
            streamingReasoningByStep.set(stepKey, [{ blockIndex: index, rowIndex: rows.length - 1 }])
          else stepList.push({ blockIndex: index, rowIndex: rows.length - 1 })
          if (turn !== undefined) {
            const list = streamingReasoningIndicesByTurn.get(turn)
            if (list === undefined) streamingReasoningIndicesByTurn.set(turn, [rows.length - 1])
            else list.push(rows.length - 1)
          }
        } else {
          rows.push({ kind, rowKey, text, ...(sourceSeq === undefined ? {} : { sourceSeq }) })
        }
        streamingRowByBlock.set(blockKey, rows.length - 1)
        const stepKindList = streamingRowsByStepKind.get(settledKey)
        if (stepKindList === undefined) streamingRowsByStepKind.set(settledKey, [rows.length - 1])
        else stepKindList.push(rows.length - 1)
        if (!settledRowByStep.has(settledKey)) settledRowByStep.set(settledKey, rows.length - 1)
      }
      continue
    }
    if (type === 'user/message') {
      const trigger = turnTriggerOf(data)
      if (trigger !== undefined) {
        const text = textFromMessage(data)
        const source = recordField(data.source)
        const blocks = messageBlocks(data)
        rows.push({
          kind: 'turn-trigger',
          trigger,
          ...(text === undefined ? {} : { text }),
          ...(source === undefined ? {} : { source }),
          ...(blocks.length > 0 ? { contentBlocks: blocks } : {}),
          ...eventTime(event),
          ...(sourceSeq === undefined ? {} : { sourceSeq }),
        })
        continue
      }
      const context = contextRowOf(data, sourceSeq, false)
      if (context !== undefined) {
        rows.push(context)
        continue
      }
      const text = humanUserText(data)
      if (text)
        rows.push({
          kind: 'user',
          text,
          ...(numberField(data.turn) === undefined ? {} : { turn: numberField(data.turn) as number }),
          ...(sourceSeq === undefined ? {} : { sourceSeq }),
          ...eventTime(event),
        })
      continue
    }
    if (type === 'assistant/message') {
      const stepKey = eventStepKey(data)
      settleStepReasoning(stepKey)
      const settled = {
        reasoning: messageBlocks(data)
          .flatMap((block) => (block.type === 'reasoning' && typeof block.text === 'string' ? [block.text.trim()] : []))
          .filter((text) => text !== '')
          .join('\n\n'),
        text: messageBlocks(data)
          .flatMap((block) => (block.type === 'text' && typeof block.text === 'string' ? [block.text] : []))
          .join('')
          .trim(),
      }
      const turn = numberField(data.turn)
      const usage = turn === undefined ? undefined : turnUsage.get(turn)
      for (const kind of ['reasoning', 'assistant'] as const) {
        const text = kind === 'reasoning' ? settled.reasoning : settled.text
        if (text === '') continue
        const slot = stepKey === undefined ? undefined : settledRowByStep.get(`${stepKey}:${kind}`)
        const extra =
          kind === 'assistant'
            ? {
                ...(turn === undefined ? {} : { turn }),
                ...(usage === undefined ? {} : { usage }),
                ...eventTime(event),
              }
            : {}
        const stepRowKey = stepKey === undefined ? undefined : `step:${stepKey}:${kind}`
        if (slot !== undefined) {
          const stableKey = rows[slot]?.rowKey ?? stepRowKey
          rows[slot] = {
            kind,
            ...(stableKey === undefined ? {} : { rowKey: stableKey }),
            text,
            ...(sourceSeq === undefined ? {} : { sourceSeq }),
            ...extra,
          } as NativeConversationRow
          // Remove any secondary streamed blocks of the same step & kind so the settled message never duplicates them.
          const streamed = stepKey === undefined ? undefined : streamingRowsByStepKind.get(`${stepKey}:${kind}`)
          if (streamed !== undefined) {
            for (const rowIndex of streamed) {
              if (rowIndex !== slot) removedIndices.add(rowIndex)
            }
          }
          continue
        }
        rows.push({
          kind,
          ...(stepRowKey === undefined ? {} : { rowKey: stepRowKey }),
          text,
          ...(sourceSeq === undefined ? {} : { sourceSeq }),
          ...extra,
        } as NativeConversationRow)
        if (stepKey !== undefined) settledRowByStep.set(`${stepKey}:${kind}`, rows.length - 1)
      }
      continue
    }
    if (type === 'tool/call') {
      settleStepReasoning(eventStepKey(data))
      const callId = stringField(data.callId)
      const toolName = stringField(data.name) ?? message('session.toolCall')
      const summary = fieldText(data.description) ?? argumentDescription(data.arguments)
      const row: NativeConversationRow = {
        kind: 'tool',
        state: 'running',
        toolName,
        ...(callId === undefined ? {} : { callId }),
        ...(fieldText(data.arguments) === undefined ? {} : { toolInput: fieldText(data.arguments) }),
        ...(metaOf(data) === undefined ? {} : { toolMeta: metaOf(data) }),
        ...(summary === undefined ? {} : { summary }),
        ...(sourceSeq === undefined ? {} : { sourceSeq }),
      }
      const preparingIndex = callId === undefined ? undefined : toolRowByCallId.get(callId)
      if (preparingIndex !== undefined && rows[preparingIndex]?.kind === 'tool') {
        const previous = rows[preparingIndex]
        rows[preparingIndex] = {
          ...row,
          ...(previous.rowKey === undefined ? {} : { rowKey: previous.rowKey }),
          ...(previous.sourceSeq === undefined ? {} : { sourceSeq: previous.sourceSeq }),
        }
        continue
      }
      rows.push(row)
      if (callId !== undefined) toolRowByCallId.set(callId, rows.length - 1)
      recordTurnTool(numberField(data.turn), rows.length - 1)
      continue
    }
    if (type === 'tool/result') {
      const result = toolResult(data)
      if (result.callId !== undefined) {
        const rowIndex = toolRowByCallId.get(result.callId)
        if (rowIndex !== undefined) {
          const existing = rows[rowIndex]
          if (existing?.kind === 'tool') {
            const resultMeta = metaOf(data)
            rows[rowIndex] = {
              ...existing,
              state: result.failed ? 'failed' : 'completed',
              ...(result.output === undefined ? {} : { output: result.output }),
              ...(resultMeta === undefined ? {} : { toolMeta: resultMeta }),
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
        ...(metaOf(data) === undefined ? {} : { toolMeta: metaOf(data) }),
        ...(sourceSeq === undefined ? {} : { sourceSeq }),
      })
      continue
    }
    if (type === 'llm/retry') {
      const failure = recordField(data.failure)
      const retry = numberField(data.retry) ?? 1
      const stepKey = eventStepKey(data)
      const nextRow: NativeConversationRow = {
        delayMs: numberField(data.delayMs) ?? 0,
        failureMessage: stringField(failure?.message) ?? message('session.modelRequestFailed'),
        kind: 'retry',
        maxRetries: numberField(data.maxRetries) ?? retry,
        retry,
        ...(sourceSeq === undefined ? {} : { sourceSeq }),
      }
      const existingIndex =
        stepKey !== undefined
          ? retryRowByStep.get(stepKey)
          : rows.length > 0 && rows[rows.length - 1]?.kind === 'retry'
            ? rows.length - 1
            : undefined
      if (existingIndex !== undefined) {
        const existing = rows[existingIndex]
        if (existing?.kind === 'retry') {
          rows[existingIndex] = {
            ...nextRow,
            ...(existing.rowKey === undefined ? {} : { rowKey: existing.rowKey }),
            ...(existing.sourceSeq === undefined ? {} : { sourceSeq: existing.sourceSeq }),
          }
          continue
        }
      }
      rows.push(nextRow)
      if (stepKey !== undefined) retryRowByStep.set(stepKey, rows.length - 1)
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
      const turn = numberField(data.turn)
      const reason = recordField(data.reason)
      const kind = stringField(reason?.kind)
      if (turn !== undefined) {
        const openReasoning = streamingReasoningIndicesByTurn.get(turn)
        if (openReasoning !== undefined) {
          for (const rowIndex of openReasoning) {
            const existing = rows[rowIndex]
            if (existing?.kind === 'reasoning' && existing.running === true) {
              const { running: _running, ...settledReasoning } = existing
              rows[rowIndex] = settledReasoning
            }
          }
          streamingReasoningIndicesByTurn.delete(turn)
        }
        const openTools = runningToolIndicesByTurn.get(turn)
        if (openTools !== undefined) {
          const interruptedTurn = kind === 'aborted' || kind === 'interrupted' || kind === 'error'
          for (const rowIndex of openTools) {
            const existing = rows[rowIndex]
            if (
              existing?.kind === 'tool' &&
              existing.state === 'running' &&
              (existing.preparing === true || interruptedTurn)
            ) {
              const { preparing: _preparing, ...restTool } = existing
              rows[rowIndex] = { ...restTool, state: interruptedTurn ? 'failed' : 'completed' }
            }
          }
          runningToolIndicesByTurn.delete(turn)
        }
      }
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
  return removedIndices.size === 0 ? rows : rows.filter((_, index) => !removedIndices.has(index))
}

/** Finds the durable start time of the currently open turn for the native running footer. */
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
  const message = recordField(data.message)
  const content = message === undefined ? data.content : message.content
  return Array.isArray(content)
    ? content.filter(
        (block): block is ContentBlock => block !== null && typeof block === 'object' && !Array.isArray(block),
      )
    : []
}

/** Collect distinct non-empty string fields from an array member on a durable source. */
function collectSourceStrings(source: EventRecord | undefined, member: string, field: string): string[] {
  const list = source?.[member]
  if (!Array.isArray(list)) return []
  const seen: string[] = []
  for (const entry of list) {
    const value = stringField(recordField(entry)?.[field])
    if (value !== undefined && !seen.includes(value)) seen.push(value)
  }
  return seen
}

function contextFormOf(source: EventRecord | undefined): KnownContextForm | undefined {
  const form = stringField(source?.form)
  return form !== undefined && KNOWN_CONTEXT_FORMS.has(form) ? (form as KnownContextForm) : undefined
}

/**
 * Reads a tool-set change out of a context injection's content blocks.
 * Matches desktop `ContextInjectionRow.tsx`: applies when every content block is a tool addition or removal.
 */
function toolChangeOf(
  blocks: readonly ContentBlock[],
): Extract<NativeConversationRow, { kind: 'context' }> | undefined {
  if (blocks.length === 0 || !blocks.every((block) => block.type === 'tool-addition' || block.type === 'tool-removal'))
    return undefined
  const added = blocks.flatMap((block) => {
    const name = block.type === 'tool-addition' ? stringField(block.toolName) : undefined
    return name === undefined ? [] : [name]
  })
  const removed = blocks.flatMap((block) => {
    const name = block.type === 'tool-removal' ? stringField(block.toolName) : undefined
    return name === undefined ? [] : [name]
  })
  const single = blocks.length === 1 ? blocks[0] : undefined
  const singleName = single === undefined ? undefined : stringField(single.toolName)
  if (single !== undefined && singleName !== undefined) {
    const singleType = single.type === 'tool-addition' ? 'tool-addition' : 'tool-removal'
    return {
      kind: 'context',
      title:
        singleType === 'tool-addition'
          ? format('conversation.toolAdded', { name: singleName })
          : format('conversation.toolRemoved', { name: singleName }),
      producer: 'tools',
      toolChanges: { added, removed, single: { type: singleType, toolName: singleName } },
      text: '',
    }
  }
  const addedCount = added.length
  const removedCount = removed.length
  const summary =
    addedCount > 0 && removedCount > 0
      ? format('conversation.toolsChanged', { added: addedCount, removed: removedCount })
      : addedCount > 0
        ? format('conversation.toolsAddedCount', { count: addedCount })
        : format('conversation.toolsRemovedCount', { count: removedCount })
  const details = [
    ...(added.length > 0 ? [format('conversation.toolsAdded', { names: added.join(', ') })] : []),
    ...(removed.length > 0 ? [format('conversation.toolsRemoved', { names: removed.join(', ') })] : []),
  ].join('\n')
  return {
    kind: 'context',
    producer: 'tools',
    title: message('conversation.toolsUpdated'),
    summary,
    toolChanges: { added, removed },
    text: details,
  }
}

/**
 * Builds a context row for a logged non-user injection or developer message, mirroring
 * desktop `message.ts` and `event-projection.ts`.
 */
function contextRowOf(
  data: EventRecord,
  sourceSeq: number | undefined,
  allowMissingSource: boolean,
): NativeConversationRow | undefined {
  const nestedMessage = recordField(data.message)
  const source = recordField(data.source) ?? recordField(nestedMessage?.source)
  const producer = stringField(source?.kind)
  if (producer === 'compact-checkpoint' || producer === 'user') return undefined
  if (!allowMissingSource && producer === undefined) return undefined
  const blocks = messageBlocks(data)
  const tools = toolChangeOf(blocks)
  if (tools !== undefined) {
    return {
      ...tools,
      ...(source === undefined ? {} : { source }),
      contentBlocks: blocks,
      ...(sourceSeq === undefined ? {} : { sourceSeq }),
    }
  }
  const text = textFromMessage(data)
  const summary = stringField(source?.summary)
  const form = contextFormOf(source)
  const hasNonTextBlock = blocks.some((block) => block.type !== 'text')
  const hasSourceBody =
    form !== undefined || (source !== undefined && Object.keys(source).some((key) => key !== 'kind'))
  if (text === undefined && summary === undefined && !hasNonTextBlock && !hasSourceBody) return undefined
  let role: 'recall' | undefined
  let producerLabel = producer ?? ''
  if (producer === 'session-reference') {
    role = 'recall'
    const labels = collectSourceStrings(source, 'references', 'label')
    if (labels.length > 0) producerLabel = labels.join(', ')
  } else if (producer === 'agent-instructions') {
    const paths = collectSourceStrings(source, 'changes', 'path')
    if (paths.length > 0) producerLabel = paths.join(', ')
  } else if (producer === 'skill-invocation') {
    producerLabel = stringField(source?.name) ?? producer
  }
  return {
    kind: 'context',
    producer: producerLabel,
    ...(role === undefined ? {} : { role }),
    ...(form === undefined ? {} : { form }),
    ...(source === undefined ? {} : { source }),
    ...(blocks.length > 0 ? { contentBlocks: blocks } : {}),
    ...(summary === undefined ? {} : { summary }),
    text: text ?? summary ?? '',
    ...(sourceSeq === undefined ? {} : { sourceSeq }),
  }
}

/** One provider/model route that contributed a billed request attempt in a Turn. */
export interface TurnTokenUsageRoute {
  provider: string
  model: string
}

/** Token accounting for one Turn, summed the way the desktop's token meter sums attempts. */
export interface TurnTokenUsage {
  calls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  routes?: readonly TurnTokenUsageRoute[]
}

type TurnUsageAccumulator = {
  calls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cacheReadTokens: number
  allCacheRead: boolean
  cacheWriteTokens: number
  allCacheWrite: boolean
  reasoningTokens: number
  allReasoning: boolean
  routes: Map<string, TurnTokenUsageRoute>
  allRoutes: boolean
}

function turnUsageByTurn(items: readonly SharedEventItem[]): Map<number, TurnTokenUsage> {
  const accumulators = new Map<number, TurnUsageAccumulator>()
  for (const item of items) {
    if (stringField(item.event.type) !== 'assistant/message') continue
    const data = recordField(item.event.data) ?? item.event
    const turn = numberField(data.turn)
    const usage = recordField(data.usage)
    if (turn === undefined || usage === undefined) continue
    const input = numberField(usage.inputTokens) ?? 0
    const output = numberField(usage.outputTokens) ?? 0
    const cacheRead = numberField(usage.cacheReadTokens)
    const cacheWrite = numberField(usage.cacheWriteTokens)
    const reasoning = numberField(usage.reasoningTokens)
    const total = numberField(usage.totalTokens) ?? input + (cacheRead ?? 0) + (cacheWrite ?? 0) + output
    const msgSource = recordField(recordField(data.message)?.source)
    const provider = stringField(msgSource?.provider) ?? stringField(data.provider)
    const model = stringField(msgSource?.model) ?? stringField(data.model)
    const current: TurnUsageAccumulator = accumulators.get(turn) ?? {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      allCacheRead: true,
      cacheWriteTokens: 0,
      allCacheWrite: true,
      reasoningTokens: 0,
      allReasoning: true,
      routes: new Map<string, TurnTokenUsageRoute>(),
      allRoutes: true,
    }
    current.calls += 1
    current.inputTokens += input
    current.outputTokens += output
    current.totalTokens += total
    if (cacheRead !== undefined) current.cacheReadTokens += cacheRead
    else current.allCacheRead = false
    if (cacheWrite !== undefined) current.cacheWriteTokens += cacheWrite
    else current.allCacheWrite = false
    if (reasoning !== undefined) current.reasoningTokens += reasoning
    else current.allReasoning = false
    if (provider !== undefined && model !== undefined) {
      current.routes.set(`${provider} ${model}`, { provider, model })
    } else {
      current.allRoutes = false
    }
    accumulators.set(turn, current)
  }
  const totals = new Map<number, TurnTokenUsage>()
  for (const [turn, acc] of accumulators) {
    totals.set(turn, {
      calls: acc.calls,
      inputTokens: acc.inputTokens,
      outputTokens: acc.outputTokens,
      totalTokens: acc.totalTokens,
      ...(acc.allCacheRead ? { cacheReadTokens: acc.cacheReadTokens } : {}),
      ...(acc.allCacheWrite ? { cacheWriteTokens: acc.cacheWriteTokens } : {}),
      ...(acc.allReasoning ? { reasoningTokens: acc.reasoningTokens } : {}),
      ...(acc.allRoutes && acc.routes.size > 0 ? { routes: [...acc.routes.values()] } : {}),
    })
  }
  return totals
}

function turnTriggerOf(data: EventRecord): NativeTurnTrigger | undefined {
  const source = recordField(data.source)
  const kind = stringField(source?.kind)
  switch (kind) {
    case 'goal':
      return 'goal'
    case 'schedule':
      return 'schedule'
    case 'subagent-settled':
      switch (stringField(source?.stopReason)) {
        case 'completed':
          return 'subagentCompleted'
        case 'aborted':
          return 'subagentAborted'
        case 'error':
          return 'subagentError'
        case 'max-tokens':
          return 'subagentMaxTokens'
        case 'refusal':
          return 'subagentRefusal'
        default:
          return 'subagentUnknown'
      }
    case 'tool-jobs':
      return 'job'
    case 'agent-message':
      return 'agent'
    case 'team-message':
      return 'team'
    case 'webhook':
      return stringField(source?.provider) === 'github' ? 'github' : 'webhook'
    case 'cordis-host-runner':
      return 'plugin'
    case 'user-approval':
      return 'approval'
    case 'retry':
      return 'continue'
    default:
      return undefined
  }
}

/** Names one waking trigger for the transcript and the exported log. */
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
    case 'subagentCompleted':
      return message('conversation.triggerSubagentCompleted')
    case 'subagentAborted':
      return message('conversation.triggerSubagentAborted')
    case 'subagentError':
      return message('conversation.triggerSubagentError')
    case 'subagentMaxTokens':
      return message('conversation.triggerSubagentMaxTokens')
    case 'subagentRefusal':
      return message('conversation.triggerSubagentRefusal')
    case 'subagentUnknown':
      return message('conversation.triggerSubagentUnknown')
    case 'github':
      return message('conversation.triggerGithub')
    case 'plugin':
      return message('conversation.triggerPlugin')
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

function argumentDescription(value: unknown): string | undefined {
  let args: unknown = value
  if (typeof value === 'string') {
    try {
      args = JSON.parse(value) as unknown
    } catch {
      return undefined
    }
  }
  if (args === null || typeof args !== 'object' || Array.isArray(args)) return undefined
  const description = (args as Record<string, unknown>).description
  return typeof description === 'string' && description.trim() ? description.trim() : undefined
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

function metaOf(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const meta = data.meta
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) return undefined
  return meta as Record<string, unknown>
}

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
  for (const value of Object.values(record)) {
    if (typeof value === 'string' && value.trim()) return collapseLine(value)
  }
  return undefined
}

function collapseLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
