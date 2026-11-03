import { clearConnection, loadConnection, saveConnection } from '@/api/connection-store'
import { t as message } from '@/locale'
import type { MobileConnection } from '@/types/mobile'
import { create } from 'zustand'

let initialization: Promise<void> | undefined

interface ConnectionState {
  connection?: MobileConnection
  initialized: boolean
  initializationError?: string
  initialize(): Promise<void>
  continueWithoutConnection(): void
  setConnection(connection: MobileConnection): Promise<void>
  forgetConnection(): Promise<void>
}

/** Holds only device-scoped connection metadata for the native mobile client. */
export const useConnectionStore = create<ConnectionState>((set, get) => ({
  initialized: false,
  async initialize(): Promise<void> {
    if (get().initialized && !get().initializationError) return
    if (initialization !== undefined) return initialization
    set({ initialized: false, initializationError: undefined })
    initialization = loadConnection()
      .then((connection) => {
        set({ connection, initialized: true })
      })
      .catch(() => {
        // Storage failures are recoverable here; the launch gate owns the visible retry.
        set({ initialized: true, initializationError: message('errors.credentialStorage') })
      })
      .finally(() => {
        initialization = undefined
      })
    return initialization
  },
  continueWithoutConnection(): void {
    set({ connection: undefined, initialized: true, initializationError: undefined })
  },
  async setConnection(connection: MobileConnection): Promise<void> {
    await saveConnection(connection)
    set({ connection, initialized: true, initializationError: undefined })
  },
  async forgetConnection(): Promise<void> {
    try {
      await clearConnection()
    } finally {
      set({ connection: undefined })
    }
  },
}))
