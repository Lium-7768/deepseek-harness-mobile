import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPermissionConfirmation, PERMISSION_CONFIRMATION_TIMEOUT } from '@/components/permission-confirmation'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())
describe('permission confirmation lifetime', () => {
  it('expires without authorizing and rejects callbacks from replaced prompts', async () => {
    const confirmation = createPermissionConfirmation()
    const old = confirmation.begin()
    expect(confirmation.busy).toBe(true)
    await vi.advanceTimersByTimeAsync(PERMISSION_CONFIRMATION_TIMEOUT)
    expect(confirmation.busy).toBe(false)
    const current = confirmation.begin()
    expect(confirmation.finish(old)).toBe(false)
    expect(confirmation.busy).toBe(true)
    expect(confirmation.finish(current)).toBe(true)
    expect(confirmation.finish(current)).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('cleans up on owner disposal and cannot confirm after cancellation', () => {
    const confirmation = createPermissionConfirmation()
    const token = confirmation.begin()
    confirmation.dismiss()
    expect(confirmation.busy).toBe(false)
    expect(confirmation.finish(token)).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})
