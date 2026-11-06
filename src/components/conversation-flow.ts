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
