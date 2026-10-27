import { describe, expect, it } from 'vitest'
import { messages, t, type MessageKey } from '../src/locale'

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
