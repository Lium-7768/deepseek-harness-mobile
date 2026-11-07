import { resolveAppearance } from '@/state/appearance-logic'
/**
 * React bindings for the mobile theme.
 *
 * Kept apart from `./index.ts` so that pure logic modules — the `*-logic.ts`
 * helpers and their tests — can import tokens without pulling React Native's
 * runtime into a Node test process.
 */
import { useAppearanceStore } from '@/state/appearance'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { themes, type AppTheme, type Appearance } from './index'

/**
 * Resolve the appearance a screen must render in.
 *
 * The system setting wins; an unknown or unset scheme (`useColorScheme()` can
 * return `null` before the first layout) falls back to light, which is the
 * appearance the app shipped with.
 *
 * @returns `'light'` or `'dark'`.
 */
export function useAppearance(): Appearance {
  const scheme = useColorScheme()
  const preference = useAppearanceStore((state) => state.preference)
  const initialize = useAppearanceStore((state) => state.initialize)
  // The stored preference is read once, off the render path; until it lands the
  // screen keeps following the OS so the first frame is never blank.
  useEffect(() => {
    void initialize()
  }, [initialize])
  return resolveAppearance(preference, scheme)
}

/**
 * Read the token set for the active appearance.
 *
 * Prefer this over importing `mobileTheme`: a module-scope import freezes the
 * light palette and ignores the system setting.
 *
 * @returns The active appearance's theme.
 */
export function useAppTheme(): AppTheme {
  const appearance = useAppearance()
  return themes[appearance]
}

/**
 * Build a style sheet from the active appearance.
 *
 * Use it for component styles that carry colours. The factory must be a stable
 * reference — define it at module scope — so the result is computed once per
 * appearance rather than on every render.
 *
 * @param factory - Builds the style object from the active theme.
 * @returns The memoized style object.
 */
export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  const theme = useAppTheme()
  // Shared per factory, not per component instance: a conversation mounts one
  // component per message row, and each instance rebuilding the whole sheet
  // repeats identical work. The factory is module scope, so the cache holds at
  // most one entry per appearance per sheet.
  let byAppearance = sheetCache.get(factory as (theme: AppTheme) => unknown)
  if (byAppearance === undefined) {
    byAppearance = new Map()
    sheetCache.set(factory as (theme: AppTheme) => unknown, byAppearance)
  }
  const cached = byAppearance.get(theme.appearance)
  if (cached !== undefined) return cached as T
  const built = factory(theme)
  byAppearance.set(theme.appearance, built)
  return built
}

/** Style sheets already built, keyed by factory then appearance. */
const sheetCache = new WeakMap<(theme: AppTheme) => unknown, Map<Appearance, unknown>>()
