import { describe, expect, it } from 'vitest'
import { MobileEventStreamError, requiresRePair } from '@/components/mobile-sync-bridge-logic'

describe('mobile event stream authentication recovery', () => {
  it('requires a new pairing only for unauthorized stream responses', () => {
    expect(requiresRePair(new MobileEventStreamError(401))).toBe(true)
    expect(requiresRePair(new MobileEventStreamError(403))).toBe(true)
    expect(requiresRePair(new MobileEventStreamError(500))).toBe(false)
    expect(requiresRePair(new Error('network failure'))).toBe(false)
  })
})
