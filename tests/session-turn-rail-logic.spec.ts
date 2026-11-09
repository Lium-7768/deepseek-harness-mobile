import { describe, expect, it } from 'vitest'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { activeRailMark, turnRail } from '@/components/session-turn-rail-logic'

const user = (turn: number, text = 'q'): NativeConversationRow => ({ kind: 'user', text, turn })
const assistant = (turn: number, text = 'a'): NativeConversationRow => ({ kind: 'assistant', text, turn })
const tool = (): NativeConversationRow => ({ kind: 'tool', toolName: 'bash', state: 'completed' })

describe('turn rail', () => {
  it('marks one row per turn, at its first message', () => {
    const rows = [user(1), tool(), assistant(1), user(2), assistant(2)]
    expect(turnRail(rows)).toEqual([
      { index: 0, turn: 1 },
      { index: 3, turn: 2 },
    ])
  })

  it('skips rows that carry no turn number', () => {
    const rows: NativeConversationRow[] = [{ kind: 'assistant', text: 'old' }, user(3)]
    expect(turnRail(rows)).toEqual([{ index: 1, turn: 3 }])
  })

  it('names the turn the reader is inside, and the first one above it', () => {
    const marks = turnRail([user(1), assistant(1), user(2), assistant(2), user(3)])
    expect(activeRailMark(marks, 0)?.turn).toBe(1)
    expect(activeRailMark(marks, 2)?.turn).toBe(2)
    expect(activeRailMark(marks, 99)?.turn).toBe(3)
    expect(activeRailMark([], 0)).toBeUndefined()
  })
})
