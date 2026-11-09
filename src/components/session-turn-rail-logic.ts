import type { NativeConversationRow } from '@/components/session-conversation-logic'

/** One mark on the turn rail: the Turn it names and the row it jumps to. */
export interface TurnRailMark {
  /** Row index of the Turn's first message, the list's jump target. */
  index: number
  /** The Turn's number, shown in the mark's accessibility label. */
  turn: number
}

/**
 * Builds the rail from the rows the list is showing.
 *
 * The desktop's rail holds one mark per Turn of the whole session, including Turns
 * whose rows have not been paged in; the phone only holds the window it can scroll,
 * so a mark exists exactly when its Turn has a row to land on. A Turn whose messages
 * arrived without a number (an older session) contributes nothing.
 *
 * @param rows - Display rows in list order.
 * @returns One mark per Turn, in list order.
 */
export function turnRail(rows: readonly NativeConversationRow[]): TurnRailMark[] {
  const marks: TurnRailMark[] = []
  const seen = new Set<number>()
  rows.forEach((row, index) => {
    if (row.kind !== 'user' && row.kind !== 'assistant') return
    const turn = row.turn
    if (turn === undefined || seen.has(turn)) return
    seen.add(turn)
    marks.push({ index, turn })
  })
  return marks
}

/**
 * Picks the mark that names the Turn currently under the reader.
 *
 * @param marks - Rail marks in list order.
 * @param firstVisibleRow - Index of the first row the viewport shows.
 * @returns The mark for the last Turn that starts at or above that row.
 */
export function activeRailMark(marks: readonly TurnRailMark[], firstVisibleRow: number): TurnRailMark | undefined {
  let active: TurnRailMark | undefined
  for (const mark of marks) {
    if (mark.index > firstVisibleRow) break
    active = mark
  }
  return active ?? marks[0]
}
