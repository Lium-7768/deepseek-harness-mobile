import type { NativeRow } from './session-turn-logic'

/** Stable keys survive older-history insertion and transient response replacement. */
export function conversationRowKey(row: NativeRow, fallback = 0): string {
  if (row.rowKey) return row.rowKey
  if (row.kind === 'tool' && row.callId) return `tool:${row.callId}`
  if (row.kind === 'command' && row.commandId) return `command:${row.commandId}`
  return `${row.kind}:${row.sourceSeq ?? fallback}`
}

/** Desktop completion actions belong to the last assistant reply in a settled turn. */
/** Spacing is owned by the flow boundary, never a negative margin in a tool component. */
export function conversationFlowGap(row: NativeRow, previous?: NativeRow): number {
  if (!previous) return 0
  if (row.kind === 'user') return 24
  if (previous.kind === 'user' || row.kind === 'turn' || previous.kind === 'turn') return 16
  if (row.kind === 'assistant' || previous.kind === 'assistant') return 12
  return 4
}

/**
 * Finds the assistant block that closes each turn, so only it carries the full action
 * strip (clock, rating, branch).
 *
 * The phone puts a copy control on every block because it has no pointer drag-select,
 * but repeating the clock and the branch action on each mid-turn block adds a row per
 * block. A turn's closing block is the last assistant row before the next prompt.
 *
 * @param rows - The display rows in render order.
 * @returns Source sequences of the closing assistant rows.
 */
export function closingAssistantSequences(rows: readonly { kind: string; sourceSeq?: number }[]): ReadonlySet<number> {
  const result = new Set<number>()
  let pending: number | undefined
  for (const row of rows) {
    if (row.kind === 'user') {
      if (pending !== undefined) result.add(pending)
      pending = undefined
      continue
    }
    if (row.kind === 'assistant' && row.sourceSeq !== undefined) pending = row.sourceSeq
  }
  if (pending !== undefined) result.add(pending)
  return result
}
