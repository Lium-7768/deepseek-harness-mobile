import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  platform: 'ios' as string,
  impact: vi.fn(async () => undefined),
  notification: vi.fn(async () => undefined),
}))

vi.mock('react-native', () => ({
  get Platform() {
    return { OS: mocks.platform }
  },
}))
vi.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning' },
  impactAsync: mocks.impact,
  notificationAsync: mocks.notification,
}))

import { tapFeedback, warnFeedback } from '@/components/haptics'

beforeEach(() => {
  mocks.platform = 'ios'
  mocks.impact.mockClear()
  mocks.notification.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('haptics', () => {
  it('taps the engine for a light confirmation', async () => {
    tapFeedback()
    await vi.waitFor(() => expect(mocks.impact).toHaveBeenCalledWith('light'))
  })

  it('warns the engine for a destructive step', async () => {
    warnFeedback()
    await vi.waitFor(() => expect(mocks.notification).toHaveBeenCalledWith('warning'))
  })

  it('stays silent on a platform without a taptic engine', async () => {
    mocks.platform = 'web'
    tapFeedback()
    warnFeedback()
    await Promise.resolve()
    expect(mocks.impact).not.toHaveBeenCalled()
    expect(mocks.notification).not.toHaveBeenCalled()
  })

  it('swallows an engine failure instead of failing the action that asked for it', async () => {
    mocks.impact.mockRejectedValueOnce(new Error('low power mode'))
    expect(() => tapFeedback()).not.toThrow()
    // The rejection is handled, so the pending promise settles without an unhandled error.
    await Promise.resolve()
  })
})
