/**
 * Whole-Turn folding for the native conversation.
 *
 * The desktop keeps the Assistant's replies visible but folds a completed Turn's
 * process behind one control reading `已完成，用时 8分52秒`; the steps and the
 * model retries that produced the replies disappear into it. The native list
 * folds the same way: one control per settled Turn, with the replies left in
 * their original order instead of a header per call.
 */

import type { NativeDisplayRow } from '@/components/session-process-logic'
import { format, t as message } from '@/locale'
import type { SharedEventItem } from '@/shared/dsh-presentation'

/** One durable Turn's sequence span and outcome. */
export type TurnSpan = {
  failed: boolean
  endSeq: number
  startSeq: number
  stopped: boolean
  turn: number
  /** Wall-clock duration in milliseconds, or undefined while the Turn is open. */
  durationMs?: number
}

/**
 * A Turn-level row the control hides: a step group, a model retry, a command, or
 * the token-limit notice.
 */
export type NativeTurnMemberRow = Extract<
  NativeDisplayRow,
  { kind: 'process' | 'retry' | 'command' | 'turn-max-tokens' }
>

/** A completed Turn folded behind one control. */
export type NativeTurnRow = {
  durationMs?: number
  failed: boolean
  kind: 'turn'
  /** A failed or stopped Turn stays open, as the desktop leaves its control inert. */
  locked: boolean
  rows: readonly NativeTurnMemberRow[]
  rowKey: string
  sourceSeq?: number
  title: string
}

/** Any row the conversation list renders. */
export type NativeRow = NativeDisplayRow | NativeTurnRow

function timeOf(item: SharedEventItem): number | undefined {
  const time = item.event.time
  return typeof time === 'number' && Number.isFinite(time) ? time : undefined
}

/**
 * Reads every durable Turn's sequence span, timing, and outcome.
 * @param items - Ordered session events.
 * @returns One span per Turn, in sequence order.
 */
export function turnSpans(items: readonly SharedEventItem[]): TurnSpan[] {
  const spans = new Map<number, TurnSpan>()
  const startTimes = new Map<number, number>()
  for (const item of items) {
    const type = item.event.type
    const data = (item.event.data ?? {}) as Record<string, unknown>
    const turn = typeof data.turn === 'number' ? data.turn : undefined
    const seq = typeof item.seq === 'number' ? item.seq : undefined
    if (turn === undefined || seq === undefined) continue
    if (type === 'turn/start') {
      const time = timeOf(item)
      if (time !== undefined) startTimes.set(turn, time)
      const existing = spans.get(turn)
      spans.set(turn, {
        failed: existing?.failed === true,
        endSeq: existing?.endSeq ?? Number.MAX_SAFE_INTEGER,
        startSeq: existing?.startSeq ?? seq,
        stopped: existing?.stopped === true,
        turn,
      })
      continue
    }
    if (type === 'turn/end') {
      const existing = spans.get(turn)
      const reason = (data.reason ?? {}) as Record<string, unknown>
      const reasonKind = typeof reason.kind === 'string' ? reason.kind : undefined
      const startTime = startTimes.get(turn)
      const endTime = timeOf(item)
      spans.set(turn, {
        failed: reasonKind === 'error',
        endSeq: seq,
        startSeq: existing?.startSeq ?? seq,
        stopped: reasonKind === 'aborted' || reasonKind === 'interrupted',
        turn,
        ...(startTime !== undefined && endTime !== undefined ? { durationMs: Math.max(0, endTime - startTime) } : {}),
      })
    }
  }
  return [...spans.values()].sort((a, b) => a.startSeq - b.startSeq)
}

/**
 * Formats a Turn duration the way the desktop prints it: `8分52秒`, `11分28秒`,
 * `1小时5分3秒`. Minutes and seconds keep their zero parts once the unit above
 * them is in play, so the shape never collapses mid-run.
 * @param durationMs - Elapsed milliseconds.
 * @returns The compact localized duration.
 */
export function formatTurnDuration(durationMs: number): string {
  const total = Math.max(0, Math.floor(durationMs / 1_000))
  const hours = Math.floor(total / 3_600)
  const minutes = Math.floor(total / 60) % 60
  const seconds = total % 60
  const parts: string[] = []
  if (hours > 0) parts.push(format('turn.hours', { count: hours }))
  if (total >= 60) parts.push(format('turn.minutes', { count: minutes }))
  parts.push(format('turn.seconds', { count: seconds }))
  return parts.join('')
}

/**
 * Names a settled Turn's control, matching the desktop's `turnProcess` copy.
 * @param span - The Turn being folded.
 * @returns The control's label.
 */
export function turnTitle(span: TurnSpan): string {
  if (span.stopped) return message('turn.stopped')
  if (span.failed) return message('turn.failed')
  if (span.durationMs === undefined) return message('turn.worked')
  return format('turn.took', { duration: formatTurnDuration(span.durationMs) })
}

function spanForSeq(spans: readonly TurnSpan[], seq: number | undefined): TurnSpan | undefined {
  if (seq === undefined) return undefined
  let low = 0
  let high = spans.length - 1
  while (low <= high) {
    const middle = (low + high) >>> 1
    const span = spans[middle]
    if (seq < span.startSeq) high = middle - 1
    else if (seq > span.endSeq) low = middle + 1
    else return span
  }
  return undefined
}

/** Whether a row is Turn-level process the control hides. */
function isTurnMember(row: NativeDisplayRow): boolean {
  return row.kind === 'process' || row.kind === 'retry' || row.kind === 'command' || row.kind === 'turn-max-tokens'
}

/**
 * Folds each completed Turn's process behind one whole-Turn control.
 *
 * Replies stay visible, as on the desktop: only the step groups, retries, and
 * command rows move behind the control, so a Turn that answers between steps
 * reads as one control followed by its replies rather than a header per step.
 * An open Turn has no end sequence, so its rows never land in a settled span and
 * keep the live step headers that name what the agent is doing.
 *
 * @param rows - Step groups and conversation rows in sequence order.
 * @param options.spans - Durable Turn spans for this session.
 * @returns Rows with completed Turns folded.
 */
export function foldCompletedTurns(
  rows: readonly NativeDisplayRow[],
  { spans }: { spans: readonly TurnSpan[] },
): NativeRow[] {
  const settled = spans.filter((span) => span.endSeq !== Number.MAX_SAFE_INTEGER)
  const owner = rows.map((row) => (isTurnMember(row) ? spanForSeq(settled, row.sourceSeq) : undefined))
  const membersByTurn = new Map<number, number[]>()
  owner.forEach((span, index) => {
    if (span === undefined) return
    const members = membersByTurn.get(span.turn)
    if (members === undefined) membersByTurn.set(span.turn, [index])
    else members.push(index)
  })
  const out: NativeRow[] = []
  const absorbed = new Set<number>()
  rows.forEach((row, index) => {
    if (absorbed.has(index)) return
    const span = owner[index]
    const members = span === undefined ? undefined : membersByTurn.get(span.turn)
    // A row outside a settled Turn, or inside the still-running newest Turn,
    // keeps the header its step grouping gave it.
    if (span === undefined || members === undefined) {
      out.push(row)
      return
    }
    // The control sits where the Turn's first process row did; the rest move inside it.
    if (members[0] !== index) return
    const turnRows: NativeTurnMemberRow[] = []
    for (const member of members) {
      const turnRow = rows[member]
      if (turnRow === undefined) continue
      turnRows.push(turnRow as NativeTurnMemberRow)
      absorbed.add(member)
    }
    out.push({
      durationMs: span.durationMs,
      failed: span.failed,
      kind: 'turn',
      locked: span.failed || span.stopped,
      rows: turnRows,
      rowKey: `turn:${span.turn}`,
      ...(turnRows[0]?.sourceSeq === undefined ? {} : { sourceSeq: turnRows[0].sourceSeq }),
      title: turnTitle(span),
    })
  })
  return out
}
