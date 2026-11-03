import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { isAppearancePreference, type AppearancePreference } from './appearance-logic'
export type { AppearancePreference } from './appearance-logic'

/** Appearance preference: an explicit scheme, or the operating system's. */

const APPEARANCE_KEY = 'dsh-mobile-appearance-v1'

interface AppearanceState {
  preference: AppearancePreference
  initialized: boolean
  initialize(): Promise<void>
  setPreference(preference: AppearancePreference): Promise<void>
}

/**
 * Holds the appearance the user picked in Settings.
 *
 * The preference outlives a screen, and the desktop's `ui-theme` value alone
 * cannot answer it: the same account can be read on a phone that also follows
 * the operating system. `system` delegates to `useColorScheme`; the two explicit
 * values hold regardless of the OS setting.
 */
export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  initialized: false,
  preference: 'system',
  async initialize(): Promise<void> {
    if (get().initialized) return
    const encoded = await SecureStore.getItemAsync(APPEARANCE_KEY).catch(() => null)
    set({ initialized: true, preference: isAppearancePreference(encoded) ? encoded : 'system' })
  },
  async setPreference(preference: AppearancePreference): Promise<void> {
    set({ preference })
    await SecureStore.setItemAsync(APPEARANCE_KEY, preference).catch(() => undefined)
  },
}))
