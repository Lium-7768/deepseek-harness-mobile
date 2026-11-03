import { create } from 'zustand'

interface DraftState {
  drafts: Record<string, string>
  setDraft(key: string, text: string): void
  clearSentDraft(key: string, submitted: string): void
  clear(): void
}

/** Unsent text survives native route switches. Image data and drafts never enter persistent storage. */
export const useComposerDraftStore = create<DraftState>((set) => ({
  drafts: {},
  setDraft(key, text) {
    set((state) => {
      const drafts = { ...state.drafts }
      delete drafts[key]
      if (text) drafts[key] = text
      const keys = Object.keys(drafts)
      for (const expired of keys.slice(0, Math.max(0, keys.length - 30))) delete drafts[expired]
      return { drafts }
    })
  },
  clearSentDraft(key, submitted) {
    set((state) => {
      if (state.drafts[key] !== submitted) return state
      const drafts = { ...state.drafts }
      delete drafts[key]
      return { drafts }
    })
  },
  clear() {
    set({ drafts: {} })
  },
}))
