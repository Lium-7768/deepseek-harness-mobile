import { describe, expect, it } from 'vitest'
import { useMobileSyncStore } from '@/state/mobile-sync'

describe('mobile sync store', () => {
  it('bumps a generation per manual restart so the stream effect reconnects', () => {
    const before = useMobileSyncStore.getState().generation
    useMobileSyncStore.getState().restartStream()
    useMobileSyncStore.getState().restartStream()
    expect(useMobileSyncStore.getState().generation).toBe(before + 2)
  })

  it('keeps the manual refresh flag in the transport store', () => {
    useMobileSyncStore.getState().setSyncing(true)
    expect(useMobileSyncStore.getState().syncing).toBe(true)
    useMobileSyncStore.getState().setSyncing(false)
    expect(useMobileSyncStore.getState().syncing).toBe(false)
  })
})
