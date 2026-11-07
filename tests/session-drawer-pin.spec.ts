import { describe, expect, it } from 'vitest'
import { runningSubagentCounts, sortSessions } from '@/components/session-drawer-logic'
import type { SessionSummary } from '@/types/mobile'

const session = (sessionId: string, updatedAt: number, extra: Partial<SessionSummary> = {}): SessionSummary => ({
  sessionId,
  updatedAt,
  ...extra,
})

describe('pinned sessions', () => {
  it('leads the section with pinned rows and keeps recency inside each half', () => {
    const items = [session('a', 300), session('b', 200), session('c', 100)]
    const ordered = sortSessions(items, 'updated', new Set(['b']))
    expect(ordered.map((item) => item.sessionId)).toEqual(['b', 'a', 'c'])
  })

  it('leaves the order untouched when nothing is pinned', () => {
    const items = [session('a', 300), session('b', 200)]
    expect(sortSessions(items, 'updated', new Set()).map((item) => item.sessionId)).toEqual(['a', 'b'])
    expect(sortSessions(items, 'updated').map((item) => item.sessionId)).toEqual(['a', 'b'])
  })

  it('keeps a manual order inside the pinned half', () => {
    const items = [session('a', 100), session('b', 300), session('c', 200)]
    const ordered = sortSessions(items, 'manual', new Set(['c']))
    expect(ordered.map((item) => item.sessionId)).toEqual(['c', 'a', 'b'])
  })
})

describe('running sub-agent counts', () => {
  const catalog = (ids: string[]) => ({ projections: { values: { subagentCatalog: ids.map((id) => ({ id })) } } })

  it('counts the catalog children the list reports as running', () => {
    const items = [
      session('parent', 1, catalog(['child-1', 'child-2', 'child-3'])),
      session('child-1', 2, { running: true }),
      session('child-2', 3, { running: true }),
      session('child-3', 4, { running: false }),
    ]
    expect(runningSubagentCounts(items).get('parent')).toBe(2)
  })

  it('omits parents with nothing running and sessions without a catalog', () => {
    const items = [
      session('parent', 1, catalog(['child-1'])),
      session('child-1', 2, { running: false }),
      session('other', 3),
    ]
    expect(runningSubagentCounts(items).size).toBe(0)
  })

  it('ignores a malformed catalog instead of throwing', () => {
    const items = [session('parent', 1, { projections: { values: { subagentCatalog: 'nope' } } })]
    expect(runningSubagentCounts(items).size).toBe(0)
  })
})
