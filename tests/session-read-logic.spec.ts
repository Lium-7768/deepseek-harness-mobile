import { describe, expect, it } from 'vitest'
import { shouldMarkSessionRead, type SessionReadSnapshot } from '@/features/session/session-read-logic'

describe('shouldMarkSessionRead', () => {
  const clientA = { id: 1 }
  const clientB = { id: 2 }

  it('marks read on initial session open', () => {
    const next: SessionReadSnapshot = { client: clientA, rowCount: 0, running: false, sessionId: 's1' }
    expect(shouldMarkSessionRead(undefined, next)).toBe(true)
  })

  it('marks read when switching to another session', () => {
    const prev: SessionReadSnapshot = { client: clientA, rowCount: 10, running: false, sessionId: 's1' }
    const next: SessionReadSnapshot = { client: clientA, rowCount: 2, running: true, sessionId: 's2' }
    expect(shouldMarkSessionRead(prev, next)).toBe(true)
  })

  it('skips repeated marks while streaming rows during an active turn', () => {
    const prev: SessionReadSnapshot = { client: clientA, rowCount: 10, running: true, sessionId: 's1' }
    const next: SessionReadSnapshot = { client: clientA, rowCount: 15, running: true, sessionId: 's1' }
    expect(shouldMarkSessionRead(prev, next)).toBe(false)
  })

  it('marks read once when a watched turn completes', () => {
    const prev: SessionReadSnapshot = { client: clientA, rowCount: 15, running: true, sessionId: 's1' }
    const next: SessionReadSnapshot = { client: clientA, rowCount: 15, running: false, sessionId: 's1' }
    expect(shouldMarkSessionRead(prev, next)).toBe(true)
  })

  it('marks read when new rows arrive on an idle session, not when unchanged', () => {
    const prev: SessionReadSnapshot = { client: clientA, rowCount: 15, running: false, sessionId: 's1' }
    expect(shouldMarkSessionRead(prev, { ...prev, rowCount: 16 })).toBe(true)
    expect(shouldMarkSessionRead(prev, { ...prev, rowCount: 15 })).toBe(false)
    expect(shouldMarkSessionRead(prev, { ...prev, rowCount: 14 })).toBe(false)
  })

  it('marks read when the API client connects or changes, not when it disconnects', () => {
    const disconnected: SessionReadSnapshot = { client: undefined, rowCount: 5, running: false, sessionId: 's1' }
    const connected: SessionReadSnapshot = { client: clientA, rowCount: 5, running: false, sessionId: 's1' }
    expect(shouldMarkSessionRead(connected, disconnected)).toBe(false)
    expect(shouldMarkSessionRead(disconnected, connected)).toBe(true)
    expect(shouldMarkSessionRead(connected, { ...connected, client: clientB })).toBe(true)
  })
})
