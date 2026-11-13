import { describe, expect, it } from 'vitest'
import {
  OLDER_HISTORY_REARM_PX,
  OLDER_HISTORY_TRIGGER_PX,
  shouldLoadOlderHistory,
} from '../src/components/session-scroll-logic.ts'

const base = { hasMore: true, loading: false, exhausted: false }

describe('older-history auto load', () => {
  it('asks for a page when the reader reaches the runway', () => {
    expect(shouldLoadOlderHistory({ ...base, offsetY: 100 })).toBe(true)
    expect(shouldLoadOlderHistory({ ...base, offsetY: OLDER_HISTORY_TRIGGER_PX })).toBe(true)
    expect(shouldLoadOlderHistory({ ...base, offsetY: OLDER_HISTORY_TRIGGER_PX + 1 })).toBe(false)
  })

  it('stays closed while a page is in flight, exhausted, or out of pages', () => {
    expect(shouldLoadOlderHistory({ ...base, loading: true, offsetY: 0 })).toBe(false)
    expect(shouldLoadOlderHistory({ ...base, exhausted: true, offsetY: 0 })).toBe(false)
    expect(shouldLoadOlderHistory({ ...base, hasMore: false, offsetY: 0 })).toBe(false)
  })

  it('does not ask again from a landing that is still inside the runway', () => {
    // The defect: a page lands and the restore leaves the reader at the top, so the next
    // frame asked for another page and the list grew and re-anchored without end.
    expect(shouldLoadOlderHistory({ ...base, offsetY: 0, awaitingRearm: true })).toBe(false)
    expect(shouldLoadOlderHistory({ ...base, offsetY: OLDER_HISTORY_TRIGGER_PX, awaitingRearm: true })).toBe(false)
  })

  it('asks again only once the reader has moved back out past the rearm line', () => {
    const inside = OLDER_HISTORY_TRIGGER_PX + OLDER_HISTORY_REARM_PX
    expect(shouldLoadOlderHistory({ ...base, offsetY: inside, awaitingRearm: true })).toBe(false)
    expect(shouldLoadOlderHistory({ ...base, offsetY: inside + 1, awaitingRearm: true })).toBe(false)
    // Once the flag is cleared by the scroll handler, the runway trigger applies again.
    expect(shouldLoadOlderHistory({ ...base, offsetY: 100, awaitingRearm: false })).toBe(true)
  })
})
