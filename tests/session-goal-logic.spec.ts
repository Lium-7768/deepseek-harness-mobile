import { describe, expect, it } from 'vitest'
import { goalDockState, goalFromProjection, goalWithActivation } from '@/components/session-goal-logic'

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
    expect(goalDockState({ ...goal, phase: 'active', activation: 'armed' })).toEqual({
      label: 'goalRunning',
      action: 'pause',
    })
    expect(goalDockState({ ...goal, phase: 'paused' })).toEqual({ label: 'goalPaused', action: 'resume' })
    expect(goalDockState({ ...goal, phase: 'complete' })).toBeUndefined()
    expect(goalDockState(undefined)).toBeUndefined()
  })
})

describe('Goal live activation and malformed optional fields', () => {
  it('shows resume for disarmed active goals, pause only for armed goals, and neither while activation is unknown', () => {
    expect(goalDockState({ ...goal, phase: 'active', activation: 'disarmed' })).toEqual({
      label: 'goalPaused',
      action: 'resume',
    })
    expect(goalDockState({ ...goal, phase: 'active' })).toEqual({ label: 'goalRunning' })
  })
  it('never applies activation from a different id or revision', () => {
    const durable = { ...goal, phase: 'active' as const }
    expect(goalWithActivation(durable, { ...durable, activation: 'armed', revision: 2 })).toBe(durable)
    expect(goalWithActivation(durable, { ...durable, activation: 'armed', id: 'other' })).toBe(durable)
    expect(goalWithActivation(durable, { ...durable, activation: 'disarmed' })?.activation).toBe('disarmed')
    expect(goalWithActivation(undefined, durable)).toBeUndefined()
  })
  it('ignores malformed blockers and drops blocker text outside the blocked phase', () => {
    for (const blockedReason of [null, [], 'reason', { message: '   ' }, { message: 12 }]) {
      expect(goalFromProjection({ goal: { goal: { ...goal, blockedReason } } })).toEqual(goal)
    }
    const complete = goalFromProjection({
      goal: { goal: { ...goal, phase: 'complete', blockedReason: { message: 'stale' } } },
    })
    expect(complete?.blockedReason).toBeUndefined()
    expect(goalDockState(complete)).toBeUndefined()
    expect(goalFromProjection({ goal: { roundsStarted: 3 } })).toBeUndefined()
  })
})
