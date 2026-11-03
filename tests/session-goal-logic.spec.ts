import { describe, expect, it } from 'vitest'
import { goalDockState, goalFromProjection } from '@/components/session-goal-logic'

const goal = { id: 'goal-1', revision: 3, objective: '完成项目界面检查', phase: 'blocked' as const }

describe('desktop goal dock', () => {
  it('reads the canonical nested projection and preserves the mutation reference and blocker', () => {
    const snapshot = { ...goal, blockedReason: { code: 'no-progress', message: '需要用户补充信息' } }
    const parsed = goalFromProjection({ goal: { goal: snapshot, roundsStarted: 20 } })
    expect(parsed).toEqual({ ...goal, blockedReason: { message: '需要用户补充信息' } })
    expect(goalDockState(parsed)).toEqual({ label: 'goalBlocked', action: 'resume' })
  })

  it('also accepts the unwrapped snapshot without inventing a goal for absent or cleared projections', () => {
    expect(goalFromProjection({ goal })).toEqual(goal)
    for (const values of [undefined, {}, { goal: null }, { goal: { goal: null } }]) {
      expect(goalFromProjection(values)).toBeUndefined()
    }
  })

  it('never exposes mutation controls with malformed or unsafe compare-and-set references', () => {
    for (const change of [
      { revision: 0 },
      { revision: -1 },
      { revision: 1.5 },
      { revision: Number.MAX_SAFE_INTEGER + 1 },
      { id: '' },
      { objective: ' ' },
      { phase: 'unknown' },
    ]) {
      expect(goalFromProjection({ goal: { goal: { ...goal, ...change } } })).toBeUndefined()
    }
  })

  it('keeps active, paused and blocked docks visible with the appropriate action; hides completed goals', () => {
    expect(goalDockState({ ...goal, phase: 'active' })).toEqual({ label: 'goalRunning', action: 'pause' })
    expect(goalDockState({ ...goal, phase: 'paused' })).toEqual({ label: 'goalPaused', action: 'resume' })
    expect(goalDockState({ ...goal, phase: 'complete' })).toBeUndefined()
    expect(goalDockState(undefined)).toBeUndefined()
  })
})
