import type { MobileSyncStatus } from '@/types/mobile'
import { create } from 'zustand'

type MobileSyncState = {
  status: MobileSyncStatus
  lastEventAt?: number
  /**
   * Bumped by {@link restartStream}. The bridge's stream effect depends on it, so
   * an increment tears the SSE connection down and opens a new one with fresh
   * session subscriptions.
   */
  generation: number
  /** True while a manual sync is running; lives here so a remount cannot drop it. */
  syncing: boolean
  setStatus: (status: MobileSyncStatus) => void
  markEvent: () => void
  restartStream: () => void
  setSyncing: (syncing: boolean) => void
}

/** Holds only mobile transport liveness; durable session data stays on the desktop. */
export const useMobileSyncStore = create<MobileSyncState>((set) => ({
  status: 'disconnected',
  generation: 0,
  syncing: false,
  setStatus: (status) => set({ status }),
  markEvent: () => set({ lastEventAt: Date.now() }),
  restartStream: () => set((state) => ({ generation: state.generation + 1 })),
  setSyncing: (syncing) => set({ syncing }),
}))
