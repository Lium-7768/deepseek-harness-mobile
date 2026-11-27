/**
 * Whole-Turn folding for the native conversation, aligned with desktop `turn-process.ts`
 * and `TurnProcessNodeView.tsx`.
 */

import type { ChatPresentationPolicy } from '@/components/chat-presentation-policy'
import { conversationRowKey } from '@/components/conversation-flow'
import type {
  NativeDisplayRow,
  NativeRow,
  NativeTurnMemberRow,
  NativeTurnRow,
  TurnDurationPart,
  TurnSpan,
} from '@/components/conversation-types'
import { format, t as message } from '@/locale'
import type { SharedEventItem } from '@/shared/dsh-presentation'

export type { NativeRow, NativeTurnMemberRow, NativeTurnRow, TurnDurationPart, TurnSpan }

function timeOf(item: SharedEventItem): number | undefined {
  const time = item.event.time
  return typeof time === 'number' && Number.isFinite(time) ? time : undefined
}

/** Reads every durable Turn's sequence span, timing, and outcome. */
export function turnSpans(items: readonly SharedEventItem[]): TurnSpan[] {
  const spans = new Map<number, TurnSpan>()
  const startTimes = new Map<number, number>()
  const earliestTurnSeq = new Map<number, number>()
  for (const item of items) {
    const type = item.event.type
    const data = (item.event.data ?? {}) as Record<string, unknown>
    const turn = typeof data.turn === 'number' ? data.turn : undefined
    const seq = typeof item.seq === 'number' ? item.seq : undefined
    if (turn === undefined || seq === undefined) continue
    const prevEarliest = earliestTurnSeq.get(turn)
    if (prevEarliest === undefined || seq < prevEarliest) earliestTurnSeq.set(turn, seq)
    if (type === 'turn/start') {
      const time = timeOf(item)
      if (time !== undefined) startTimes.set(turn, time)
      const existing = spans.get(turn)
      spans.set(turn, {
        failed: existing?.failed === true,
        endSeq: existing?.endSeq ?? Number.MAX_SAFE_INTEGER,
        startSeq: Math.min(existing?.startSeq ?? seq, seq),
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
      // A partial historical Turn whose turn/start fell outside the loaded window still folds
      // over every in-window event carrying its turn number.
      const fallbackStart = earliestTurnSeq.get(turn) ?? seq
      spans.set(turn, {
        failed: reasonKind === 'error',
        endSeq: seq,
        startSeq: existing?.startSeq ?? fallbackStart,
        stopped: reasonKind === 'aborted' || reasonKind === 'interrupted',
        turn,
        ...(startTime !== undefined && endTime !== undefined ? { durationMs: Math.max(0, endTime - startTime) } : {}),
      })
    }
  }
  return [...spans.values()].sort((a, b) => a.startSeq - b.startSeq)
}

/**
 * Builds structured numeric/unit duration fragments matching desktop `formatRunDuration`.
 */
export function formatTurnDurationParts(durationMs: number): TurnDurationPart[] {
  const total = Math.max(0, Math.floor(durationMs / 1_000))
  const hours = Math.floor(total / 3_600)
  const minutes = Math.floor(total / 60) % 60
  const seconds = total % 60
  const parts: TurnDurationPart[] = []
  if (hours > 0) {
    parts.push({ text: String(hours), numeric: true }, { text: message('turn.hourUnit'), numeric: false })
  }
  if (total >= 60) {
    parts.push({ text: String(minutes), numeric: true }, { text: message('turn.minuteUnit'), numeric: false })
  }
  parts.push({ text: String(seconds), numeric: true }, { text: message('turn.secondUnit'), numeric: false })
  return parts
}

/** Formats a Turn duration the way the desktop prints it: `8分52秒`, `1小时5分3秒`. */
export function formatTurnDuration(durationMs: number): string {
  return formatTurnDurationParts(durationMs)
    .map((part) => part.text)
    .join('')
}

/** Names a settled Turn's control, matching the desktop's `turnProcess` copy. */
export function turnTitle(span: TurnSpan): string {
  if (span.stopped) return message('turn.stopped')
  if (span.failed) return message('turn.failed')
  if (span.durationMs === undefined) return message('turn.worked')
  return format('turn.took', { duration: formatTurnDuration(Math.max(1_000, span.durationMs)) })
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

/** Whether a row is Turn-level process the control hides (`turn-error` & `turn-max-tokens` stay outside). */
function isTurnMember(row: NativeDisplayRow): boolean {
  return (
    row.kind === 'process' ||
    row.kind === 'retry' ||
    row.kind === 'command' ||
    row.kind === 'context' ||
    row.kind === 'reasoning' ||
    row.kind === 'tool' ||
    row.kind === 'compaction'
  )
}

/**
 * Returns the Turn number whose completion collapse is deferred under `collapseTiming: "next-input"`.
 */
export function deferredLatestTurn(
  rows: readonly { kind: string; sourceSeq?: number }[],
  spans: readonly TurnSpan[],
  policy?: ChatPresentationPolicy,
): number | undefined {
  if (policy?.collapseTiming !== 'next-input') return undefined
  const latest = spans.at(-1)
  if (latest === undefined || latest.endSeq === Number.MAX_SAFE_INTEGER) return undefined
  const hasLaterInput = rows.some(
    (row) => (row.kind === 'user' || row.kind === 'turn-trigger') && (row.sourceSeq ?? -1) > latest.endSeq,
  )
  return hasLaterInput ? undefined : latest.turn
}

/**
 * Folds each completed Turn's process behind one whole-Turn control, respecting
 * desktop `ChatPresentationPolicy` (`foldCompletedTurns`, `collapseTiming`, `foldedReplies`)
 * and keeping failed, stopped, or interleaved-input Turns open (`locked: true`).
 */
/** Collects inner step-group and member disclosure keys so collapsing a Turn resets all of them. */
export function collectTurnDescendantKeys(rows: readonly NativeTurnMemberRow[]): string[] {
  const keys: string[] = []
  for (const row of rows) {
    keys.push(conversationRowKey(row))
    if (row.kind === 'process') {
      for (const member of row.rows) {
        keys.push(conversationRowKey(member))
      }
    }
  }
  return keys
}

/** Splits sorted member indices into contiguous runs so kept mid-turn replies stay in chronological order. */
function splitContiguousRuns(indices: readonly number[]): number[][] {
  const runs: number[][] = []
  for (const index of indices) {
    const current = runs.at(-1)
    if (current !== undefined && current.at(-1) === index - 1) current.push(index)
    else runs.push([index])
  }
  return runs
}

export function foldCompletedTurns(
  rows: readonly NativeDisplayRow[],
  { policy, spans }: { spans: readonly TurnSpan[]; policy?: ChatPresentationPolicy },
): NativeRow[] {
  if (policy?.foldCompletedTurns === false) return [...rows]
  const deferredTurn = deferredLatestTurn(rows, spans, policy)
  const settled = spans.filter((span) => span.endSeq !== Number.MAX_SAFE_INTEGER)
  const finalAnswerIndexByTurn = new Map<number, number>()
  if (policy?.foldedReplies === 'final') {
    rows.forEach((row, index) => {
      if (row.kind !== 'assistant') return
      const span = spanForSeq(settled, row.sourceSeq)
      if (span !== undefined) finalAnswerIndexByTurn.set(span.turn, index)
    })
    rows.forEach((row, index) => {
      if (!isTurnMember(row)) return
      const span = spanForSeq(settled, row.sourceSeq)
      if (span === undefined) return
      const answerIndex = finalAnswerIndexByTurn.get(span.turn)
      if (answerIndex !== undefined && index > answerIndex) finalAnswerIndexByTurn.delete(span.turn)
    })
  }
  const owner = rows.map((row, index) => {
    if (isTurnMember(row)) return spanForSeq(settled, row.sourceSeq)
    if (policy?.foldedReplies === 'final' && row.kind === 'assistant') {
      const span = spanForSeq(settled, row.sourceSeq)
      if (span !== undefined && finalAnswerIndexByTurn.get(span.turn) !== index) return span
    }
    return undefined
  })
  const membersByTurn = new Map<number, number[]>()
  owner.forEach((span, index) => {
    if (span === undefined) return
    const members = membersByTurn.get(span.turn)
    if (members === undefined) membersByTurn.set(span.turn, [index])
    else members.push(index)
  })
  const interleavedTurns = new Set<number>()
  rows.forEach((row, index) => {
    if (row.kind !== 'user') return
    const span = spanForSeq(settled, row.sourceSeq)
    if (span === undefined) return
    const firstMember = membersByTurn.get(span.turn)?.[0]
    if (firstMember !== undefined && index > firstMember) interleavedTurns.add(span.turn)
  })
  const segmentStart = new Map<number, NativeTurnRow>()
  const absorbed = new Set<number>()
  for (const span of settled) {
    const members = membersByTurn.get(span.turn)
    if (members === undefined || members.length === 0) continue
    const runs = splitContiguousRuns(members)
    const controlKey = 'turn:' + String(span.turn)
    const showDuration = span.durationMs !== undefined && !span.failed && !span.stopped
    const durationParts = showDuration ? formatTurnDurationParts(Math.max(1_000, span.durationMs as number)) : undefined
    const locked = span.failed || span.stopped || interleavedTurns.has(span.turn)
    const defaultOpen = span.turn === deferredTurn
    const title = turnTitle(span)
    const allMemberRows = members.flatMap((memberIndex) => {
      const memberRow = rows[memberIndex]
      return memberRow === undefined ? [] : [memberRow as NativeTurnMemberRow]
    })
    const descendantKeys = collectTurnDescendantKeys(allMemberRows)
    runs.forEach((run, partIndex) => {
      const segmentRows: NativeTurnMemberRow[] = []
      for (const memberIndex of run) {
        const memberRow = rows[memberIndex]
        if (memberRow === undefined) continue
        segmentRows.push(memberRow as NativeTurnMemberRow)
        absorbed.add(memberIndex)
      }
      const startIndex = run[0]
      if (startIndex === undefined || segmentRows.length === 0) return
      const isContinuation = partIndex > 0
      segmentStart.set(startIndex, {
        controlKey,
        ...(isContinuation ? { continuation: true } : { descendantKeys }),
        ...(defaultOpen ? { defaultOpen: true } : {}),
        ...(span.durationMs === undefined ? {} : { durationMs: span.durationMs }),
        ...(durationParts === undefined ? {} : { durationParts }),
        failed: span.failed,
        kind: 'turn',
        locked,
        rows: segmentRows,
        rowKey: isContinuation ? controlKey + ':part:' + String(partIndex) : controlKey,
        ...(segmentRows[0]?.sourceSeq === undefined ? {} : { sourceSeq: segmentRows[0].sourceSeq }),
        title,
        turn: span.turn,
      })
    })
  }
  const out: NativeRow[] = []
  rows.forEach((row, index) => {
    const segment = segmentStart.get(index)
    if (segment !== undefined) {
      out.push(segment)
      return
    }
    if (absorbed.has(index)) return
    out.push(row)
  })
  return out
}
