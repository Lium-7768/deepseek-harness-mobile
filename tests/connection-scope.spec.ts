import { describe, expect, it } from 'vitest'
import { mobileConnectionScope } from '@/state/connection-scope'

describe('mobile connection cache scope', () => {
  it('changes only when the paired desktop identity changes', () => {
    const first = mobileConnectionScope({
      gatewayUrl: 'https://desktop-a.test',
      deviceId: 'device-a',
      accessToken: 'token-a',
    })
    const sameDevice = mobileConnectionScope({
      gatewayUrl: 'https://desktop-a.test',
      deviceId: 'device-a',
      accessToken: 'token-b',
    })
    const otherDevice = mobileConnectionScope({
      gatewayUrl: 'https://desktop-a.test',
      deviceId: 'device-b',
      accessToken: 'token-a',
    })
    expect(first).toBe(sameDevice)
    expect(first).not.toBe(otherDevice)
    expect(mobileConnectionScope(undefined)).toBeUndefined()
  })
})
