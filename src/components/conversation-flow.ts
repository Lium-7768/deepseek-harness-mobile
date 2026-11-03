import type { NativeConversationRow } from './session-conversation-logic'
import type { NativeRow, TurnSpan } from './session-turn-logic'

/** Stable keys survive older-history insertion and transient response replacement. */
export function conversationRowKey(row: NativeRow, fallback = 0): string {
  if (row.rowKey) return row.rowKey
  if (row.kind === 'tool' && row.callId) return `tool:${row.callId}`
  if (row.kind === 'command' && row.commandId) return `command:${row.commandId}`
  return `${row.kind}:${row.sourceSeq ?? fallback}`
}

/** Desktop completion actions belong to the last assistant reply in a settled turn. */
export function assistantActionSequences(
  rows: readonly NativeConversationRow[],
  spans: readonly TurnSpan[],
): ReadonlySet<number> {
  const result = new Set<number>()
  let spanIndex = 0
  let last: number | undefined
  for (const row of rows) {
    if (row.sourceSeq === undefined) continue
    while (spanIndex < spans.length && row.sourceSeq > spans[spanIndex].endSeq) {
      if (last !== undefined && spans[spanIndex].endSeq !== Number.MAX_SAFE_INTEGER) result.add(last)
      last = undefined
      spanIndex++
    }
    const span = spans[spanIndex]
    if (row.kind !== 'assistant') continue
    if (!span || row.sourceSeq < span.startSeq) result.add(row.sourceSeq)
    else last = row.sourceSeq
  }
  if (last !== undefined && spans[spanIndex]?.endSeq !== Number.MAX_SAFE_INTEGER) result.add(last)
  return result
}

/** Spacing is owned by the flow boundary, never a negative margin in a tool component. */
export function conversationFlowGap(row: NativeRow, previous?: NativeRow): number {
  if (!previous) return 0
  if (row.kind === 'user') return 24
  if (previous.kind === 'user' || row.kind === 'turn' || previous.kind === 'turn') return 16
  if (row.kind === 'assistant' || previous.kind === 'assistant') return 12
  return 4
}
