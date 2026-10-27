import { describe, expect, it } from 'vitest'
import { format, messages, t, type MessageKey } from '../src/locale'

const keys = Object.keys(messages) as MessageKey[]

describe('locale', () => {
  it('declares at least one message', () => {
    expect(keys.length).toBeGreaterThan(0)
  })

  it('resolves every key to non-empty copy', () => {
    for (const key of keys) {
      expect(t(key).length, key).toBeGreaterThan(0)
      expect(t(key).trim(), key).toBe(t(key))
    }
  })

  it('namespaces every key by screen or shared role', () => {
    for (const key of keys) expect(key, key).toMatch(/^[a-z]+\.[a-zA-Z]+$/)
  })

  it('does not leave a placeholder or a TODO in shipped copy', () => {
    for (const key of keys) {
      expect(t(key), key).not.toMatch(/TODO|FIXME|XXX|\{\{|\}\}/)
    }
  })
})

describe('format', () => {
  it('substitutes every named placeholder', () => {
    expect(format('session.dateSameYear', { month: 10, day: 28 })).toBe('10月28日')
    expect(format('session.statsTurns', { turns: 3, steps: 11 })).toBe('3 轮 · 11 步')
  })

  it('leaves a placeholder the caller did not supply, so the gap is visible', () => {
    expect(format('session.dateWithYear', { month: 1, day: 2 })).toBe('{year}年1月2日')
  })

  it('ignores values the message does not name', () => {
    expect(format('session.statsCacheHit', { percent: 42, extra: 'x' })).toBe('缓存命中 42%')
  })
})
