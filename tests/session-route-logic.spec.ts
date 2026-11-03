import { describe, expect, it } from 'vitest'
import { permissionOptionsLocked } from '@/components/session-route-logic'

describe('session permission interaction guards', () => {
  it('locks permission changes for unknown, busy, and submitting states', () => {
    expect(
      permissionOptionsLocked({
        eventsError: true,
        eventsPending: false,
        eventsStale: false,
        status: undefined,
        submitting: false,
      }),
    ).toBe(true)
    expect(
      permissionOptionsLocked({
        eventsError: false,
        eventsPending: true,
        eventsStale: false,
        status: 'idle',
        submitting: false,
      }),
    ).toBe(true)
    expect(
      permissionOptionsLocked({
        eventsError: false,
        eventsPending: false,
        eventsStale: true,
        status: 'idle',
        submitting: false,
      }),
    ).toBe(true)
    expect(
      permissionOptionsLocked({
        eventsError: false,
        eventsPending: false,
        eventsStale: false,
        status: 'running',
        submitting: false,
      }),
    ).toBe(true)
    expect(
      permissionOptionsLocked({
        eventsError: false,
        eventsPending: false,
        eventsStale: false,
        status: 'idle',
        submitting: true,
      }),
    ).toBe(true)
    expect(
      permissionOptionsLocked({
        eventsError: false,
        eventsPending: false,
        eventsStale: false,
        status: 'idle',
        submitting: false,
      }),
    ).toBe(false)
  })
})
