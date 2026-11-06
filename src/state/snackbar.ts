import { create } from 'zustand'

/** One transient message under the content: a statement of what just happened. */
export interface SnackbarMessage {
  readonly id: number
  readonly text: string
  /** Present only when the action can be taken back; runs once even if pressed twice. */
  readonly undo?: () => void
}

interface SnackbarState {
  current: SnackbarMessage | undefined
  /** Messages waiting behind the visible one, oldest first. */
  queued: readonly SnackbarMessage[]
  show(message: Omit<SnackbarMessage, 'id'>): void
  dismiss(id: number): void
}

/** Milliseconds a message stays before it yields to the next one. */
export const SNACKBAR_VISIBLE_MS = 4000

let nextId = 1

/**
 * Transient confirmations with an optional undo.
 *
 * One message shows at a time and the rest queue: stacking them would cover the composer,
 * and replacing the visible one would take away the reader's chance to press undo. An undo
 * runs at most once, because a double press would otherwise fire two Host requests for the
 * same reversal.
 */
export const useSnackbarStore = create<SnackbarState>((set, get) => ({
  current: undefined,
  queued: [],
  show(message) {
    const entry: SnackbarMessage = { ...message, id: nextId++ }
    const state = get()
    if (state.current === undefined) set({ current: entry })
    else set({ queued: [...state.queued, entry] })
  },
  dismiss(id) {
    const state = get()
    if (state.current?.id !== id) return
    const [next, ...rest] = state.queued
    set({ current: next, queued: rest })
  },
}))

/**
 * Shows a message and, when the action is reversible, offers the undo beside it.
 *
 * The undo closure is guarded here rather than at each call site: a reader tapping twice
 * must not produce two reversals.
 *
 * @param text - The statement printed to the reader.
 * @param undo - Reverses the action; runs once.
 * @returns Nothing.
 */
export function showSnackbar(text: string, undo?: () => void): void {
  let used = false
  useSnackbarStore.getState().show({
    text,
    ...(undo === undefined
      ? {}
      : {
          undo: () => {
            if (used) return
            used = true
            undo()
          },
        }),
  })
}
