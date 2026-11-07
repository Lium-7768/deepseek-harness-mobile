import { create } from 'zustand'

/** Where a conversation was left: the offset, the content height it addressed, and its row count. */
export type ReadingPosition = { contentHeight: number; offsetY: number; rows: number }

type ReadingPositionState = {
  positions: Record<string, ReadingPosition>
  /** Drops entries beyond the cap so a long browsing session cannot grow without bound. */
  remember(sessionId: string, position: ReadingPosition): void
  /** Called when the reader returns to the bottom: the next open should land there too. */
  forget(sessionId: string): void
  clear(): void
}

/** Keeps a bounded number of conversations. Memory only: a cold start lands at the newest message. */
const POSITION_LIMIT = 30

/** Reading positions per conversation, used to reopen a long transcript where it was left. */
export const useReadingPositionStore = create<ReadingPositionState>((set) => ({
  positions: {},
  remember(sessionId, position) {
    set((state) => {
      const positions = { ...state.positions }
      delete positions[sessionId]
      positions[sessionId] = position
      const keys = Object.keys(positions)
      for (const expired of keys.slice(0, Math.max(0, keys.length - POSITION_LIMIT))) delete positions[expired]
      return { positions }
    })
  },
  forget(sessionId) {
    set((state) => {
      if (state.positions[sessionId] === undefined) return state
      const positions = { ...state.positions }
      delete positions[sessionId]
      return { positions }
    })
  },
  clear() {
    set({ positions: {} })
  },
}))
