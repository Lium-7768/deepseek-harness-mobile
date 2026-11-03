import { format, t as message } from '@/locale'
import type { SharedEventItem } from '@/shared/dsh-presentation'

export type NativeTrajectoryActivityKind =
  'assistant' | 'compaction' | 'context' | 'error' | 'question' | 'reasoning' | 'retry' | 'tool' | 'user'

export type NativeTrajectoryActivityState = 'completed' | 'failed' | 'running'

export type NativeTrajectoryActivity = {
  id: string
  kind: NativeTrajectoryActivityKind
  title: string
  detail?: string
  state?: NativeTrajectoryActivityState
  toolName?: string
  turn?: number
  showTurn?: boolean
  durationMs?: number
}

type EventRecord = Record<string, unknown>
type MessageBlock = { type?: unknown; text?: unknown }

/**
 * Maps desktop durable events to the small set of user-readable activities that
 * belong in the native trajectory tab. Transport-only events, streaming deltas,
 * and turn delimiters are deliberately omitted because the desktop ledger also
 * presents their semantic result rather than its raw event protocol.
 *
 * @param items - Gateway history and live events in durable-sequence order.
 * @returns Ordered, correlated activities suitable for a native list.
 */
export function projectNativeTrajectoryActivities(items: readonly SharedEventItem[]): NativeTrajectoryActivity[] {
  const activities: NativeTrajectoryActivity[] = []
  const toolByCallId = new Map<string, { index: number; startedAt?: number }>()
  let openTurn: number | undefined

  for (const item of orderedItems(items)) {
    const event = item.event
    const type = stringField(event.type)
    if (type === undefined) continue
    const data = recordField(event.data) ?? event
    const turn = numberField(data.turn) ?? openTurn
    const time = numberField(event.time)

    if (type === 'turn/start') {
      openTurn = numberField(data.turn) ?? openTurn
      continue
    }
    if (type === 'turn/end') {
      openTurn = undefined
      continue
    }
    if (type === 'assistant/chunk') continue

    if (type === 'user/message') {
      pushActivity(activities, {
        id: activityId(item, 'user'),
        kind: 'user',
        title: message('trajectory.userRequest'),
        ...textDetail(messageText(data)),
        ...turnField(turn),
      })
      continue
    }

    if (type === 'assistant/message') {
      const blocks = messageBlocks(data)
      const text = blocks
        .flatMap((block) => (block.type === 'text' && typeof block.text === 'string' ? [block.text] : []))
        .join('\n')
      const reasoning = blocks
        .flatMap((block) => (block.type === 'reasoning' && typeof block.text === 'string' ? [block.text] : []))
        .join('\n')
      if (reasoning.trim()) {
        pushActivity(activities, {
          id: activityId(item, 'reasoning'),
          kind: 'reasoning',
          title: message('trajectory.analyze'),
          ...textDetail(reasoning),
          ...turnField(turn),
        })
      }
      if (text.trim()) {
        pushActivity(activities, {
          id: activityId(item, 'assistant'),
          kind: 'assistant',
          title: message('trajectory.generateReply'),
          ...textDetail(text),
          ...turnField(turn),
        })
      }
      continue
    }

    if (type === 'tool/call') {
      const callId = stringField(data.callId)
      const toolName = stringField(data.name) ?? message('trajectory.tool')
      const activity: NativeTrajectoryActivity = {
        id: activityId(item, callId ?? `tool-${activities.length}`),
        kind: 'tool',
        state: 'running',
        title: toolActivityTitle(toolName),
        toolName,
        ...textDetail(toolCallDetail(toolName, data)),
        ...turnField(turn),
      }
      pushActivity(activities, activity)
      if (callId !== undefined) {
        toolByCallId.set(callId, {
          index: activities.length - 1,
          ...(time === undefined ? {} : { startedAt: time }),
        })
      }
      continue
    }

    if (type === 'tool/result') {
      const result = toolResult(data)
      const knownTool = result.callId === undefined ? undefined : toolByCallId.get(result.callId)
      if (knownTool !== undefined) {
        const current = activities[knownTool.index]
        if (current !== undefined) {
          activities[knownTool.index] = {
            ...current,
            state: result.failed ? 'failed' : 'completed',
            title: toolActivityTitle(current.toolName ?? message('trajectory.tool')),
            ...textDetail(toolResultDetail(result.output, result.failed)),
            ...(time === undefined || knownTool.startedAt === undefined
              ? {}
              : { durationMs: Math.max(0, time - knownTool.startedAt) }),
          }
        }
        continue
      }
      pushActivity(activities, {
        id: activityId(item, 'tool-result'),
        kind: 'tool',
        state: result.failed ? 'failed' : 'completed',
        title: message('trajectory.executeAction'),
        ...textDetail(toolResultDetail(result.output, result.failed)),
        ...turnField(turn),
      })
      continue
    }

    if (type === 'llm/retry') {
      const failure = recordField(data.failure)
      pushActivity(activities, {
        id: activityId(item, 'retry'),
        kind: 'retry',
        title: message('trajectory.reconnecting'),
        ...textDetail(stringField(failure?.message)),
        ...turnField(turn),
      })
      continue
    }

    if (type === 'turn/error') {
      pushActivity(activities, {
        id: activityId(item, 'turn-error'),
        kind: 'error',
        title: message('trajectory.turnIncomplete'),
        ...textDetail(stringField(data.message)),
        ...turnField(turn),
      })
      continue
    }

    if (type.includes('context')) {
      const source = [data.sourceName, data.source, data.filename, data.fileName].find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
      pushActivity(activities, {
        id: activityId(item, 'context'),
        kind: 'context',
        title: message('trajectory.referencesLoaded'),
        ...textDetail(source === undefined ? undefined : fileName(source)),
        ...turnField(turn),
      })
      continue
    }

    if (type.includes('compact')) {
      pushActivity(activities, {
        id: activityId(item, 'compaction'),
        kind: 'compaction',
        title: message('trajectory.historyCompacted'),
        ...textDetail(stringField(data.summary)),
        ...turnField(turn),
      })
      continue
    }

    if (type.includes('approval') || type.includes('question')) {
      pushActivity(activities, {
        id: activityId(item, 'question'),
        kind: 'question',
        title: message('trajectory.needsConfirmation'),
        ...textDetail(stringField(data.question) ?? stringField(data.message) ?? stringField(data.title)),
        ...turnField(turn),
      })
    }
  }

  const firstActivityByTurn = new Set<number>()
  return activities.map((activity) => {
    if (activity.turn === undefined || firstActivityByTurn.has(activity.turn)) return activity
    firstActivityByTurn.add(activity.turn)
    return { ...activity, showTurn: true }
  })
}

/**
 * Formats one tool call's duration the way the Web trajectory prints it.
 *
 * `formatDurationMs` in `TrajectoryTable` renders `unit.milliseconds` below one
 * second and `unit.seconds` with two decimals below ten, one above. Minute-scale
 * spans keep the Web's seconds unit rather than splitting into minutes, so a
 * 79-second call reads `79.0 秒` on both clients.
 *
 * @param milliseconds - Elapsed time for the call, clamped at zero.
 * @returns The Web-compatible duration label.
 */
export function formatTrajectoryDuration(milliseconds: number): string {
  const elapsed = Math.max(0, milliseconds)
  if (elapsed < 1_000) return format('trajectory.durationMilliseconds', { value: Math.round(elapsed) })
  return format('trajectory.durationSeconds', { value: (elapsed / 1_000).toFixed(elapsed < 10_000 ? 2 : 1) })
}

function toolActivityTitle(toolName: string): string {
  return toolActionName(toolName)
}

function toolActionName(toolName: string): string {
  const normalized = toolName.toLowerCase()
  if (normalized === 'bash' || normalized.includes('terminal')) return message('trajectory.actionRunCommand')
  if (normalized.includes('read') || normalized.includes('open_file')) return message('trajectory.actionReadFile')
  if (normalized.includes('write') || normalized.includes('edit')) return message('trajectory.actionEditFile')
  if (normalized.includes('search')) return message('trajectory.actionSearch')
  if (normalized.includes('todo')) return message('trajectory.actionUpdateTodo')
  if (normalized.includes('goal')) return message('trajectory.actionViewGoal')
  if (normalized.includes('job_output')) return message('trajectory.actionViewJobOutput')
  if (normalized.includes('browser')) return message('trajectory.actionBrowse')
  return message('trajectory.executeAction')
}

function toolCallDetail(toolName: string, data: EventRecord): string {
  const description = stringField(data.description)
  if (description !== undefined && !isTechnicalText(description)) return description
  const target = toolTarget(data.arguments)
  return target === undefined
    ? format('trajectory.running', { action: toolActionName(toolName) })
    : format('trajectory.runningWithTarget', { action: toolActionName(toolName), target })
}

function toolResultDetail(output: string | undefined, failed: boolean): string {
  const readable = output === undefined || isTechnicalText(output) ? undefined : previewText(output)
  if (readable !== undefined) return readable
  return failed ? message('trajectory.toolFailed') : message('trajectory.toolDone')
}

function toolTarget(value: unknown): string | undefined {
  const record = recordField(value)
  if (record === undefined) return undefined
  const path = stringField(record.path)
  if (path !== undefined) return fileName(path)
  return stringField(record.query) ?? stringField(record.url)
}

function isTechnicalText(value: string): boolean {
  const trimmed = value.trim()
  return (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    /(^|\s)(Error|TypeError|ReferenceError|SyntaxError|Traceback|stack trace)\b/i.test(trimmed)
  )
}

function activityId(item: SharedEventItem, suffix: string): string {
  return `trajectory:${item.seq ?? 'live'}:${suffix}`
}

function orderedItems(items: readonly SharedEventItem[]): SharedEventItem[] {
  return [...items].sort(
    (left, right) => (left.seq ?? Number.MAX_SAFE_INTEGER) - (right.seq ?? Number.MAX_SAFE_INTEGER),
  )
}

function pushActivity(activities: NativeTrajectoryActivity[], activity: NativeTrajectoryActivity): void {
  activities.push(activity)
}

function turnField(turn: number | undefined): Pick<NativeTrajectoryActivity, 'turn'> {
  return turn === undefined ? {} : { turn }
}

function textDetail(value: string | undefined): Pick<NativeTrajectoryActivity, 'detail'> {
  const detail = previewText(value)
  return detail === undefined ? {} : { detail }
}

/**
 * Trims one detail string to a ledger-sized preview.
 *
 * Line breaks survive: a heading, table, or list is structure the reader has to
 * see, and collapsing them into spaces turned `## 标题` plus a table into one
 * paragraph of Markdown source.
 * @param value - raw detail text from the event.
 * @returns the preview, or undefined when the text is blank.
 */
function previewText(value: string | undefined): string | undefined {
  const normalized = value
    ?.replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!normalized) return undefined
  const limit = 160
  if (normalized.length <= limit) return normalized
  // Cut on a line boundary so the preview never ends mid-token or mid-fence.
  const clipped = normalized.slice(0, limit)
  const lastBreak = clipped.lastIndexOf('\n')
  const body = lastBreak > limit * 0.6 ? clipped.slice(0, lastBreak) : clipped
  return `${body.trimEnd()}…`
}

function messageBlocks(data: EventRecord): MessageBlock[] {
  const message = recordField(data.message)
  const content = message?.content
  return Array.isArray(content)
    ? content.filter(
        (block): block is MessageBlock => block !== null && typeof block === 'object' && !Array.isArray(block),
      )
    : []
}

function messageText(data: EventRecord): string | undefined {
  const text = messageBlocks(data)
    .flatMap((block) => (block.type === 'text' && typeof block.text === 'string' ? [block.text] : []))
    .join('\n')
  return previewText(text)
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

function fileName(value: string): string {
  return value.split(/[\\/]/).at(-1)?.trim() || value
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

/**
 * Collapses a ledger row's body to the single line the desktop prints.
 *
 * The desktop's trajectory cells hold one truncated line per row; the phone was
 * rendering the whole Markdown body and clipping it at a fixed height, which cut
 * rows mid-line. Headings, list bullets, and code fences are stripped here so the
 * preview reads as prose rather than as markup.
 *
 * @param detail - Markdown body carried by the activity, if it has one.
 * @returns One whitespace-collapsed line, or an empty string.
 */
export function trajectoryDetailPreview(detail: string | undefined): string {
  if (detail === undefined) return ''
  return detail
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}
