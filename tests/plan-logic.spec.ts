import { describe, expect, it } from 'vitest'
import { planChipVisible, planFromProjection } from '@/components/plan-logic'

describe('plan projection reading', () => {
  it('accepts only a pair of booleans at the wire boundary', () => {
    expect(planFromProjection(undefined)).toBeUndefined()
    expect(planFromProjection({})).toBeUndefined()
    expect(planFromProjection({ plan: null })).toBeUndefined()
    expect(planFromProjection({ plan: 'active' })).toBeUndefined()
    expect(planFromProjection({ plan: [] })).toBeUndefined()
    expect(planFromProjection({ plan: { active: 'yes', pending: false } })).toBeUndefined()
    expect(planFromProjection({ plan: { active: true } })).toBeUndefined()
    expect(planFromProjection({ plan: { active: true, pending: false } })).toEqual({ active: true, pending: false })
    expect(planFromProjection({ plan: { active: false, pending: true } })).toEqual({ active: false, pending: true })
  })
})

describe('plan chip visibility', () => {
  it('follows the desktop rule: pending flips the target, otherwise show while active', () => {
    expect(planChipVisible(undefined)).toBe(false)
    expect(planChipVisible({ active: false, pending: false })).toBe(false)
    expect(planChipVisible({ active: true, pending: false })).toBe(true)
    expect(planChipVisible({ active: false, pending: true })).toBe(true)
    expect(planChipVisible({ active: true, pending: true })).toBe(false)
  })
})
