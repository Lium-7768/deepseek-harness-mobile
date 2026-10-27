/**
 * React bindings for the mobile theme.
 *
 * Kept apart from `./index.ts` so that pure logic modules — the `*-logic.ts`
 * helpers and their tests — can import tokens without pulling React Native's
 * runtime into a Node test process.
 */
import { useMemo } from 'react'
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
  return scheme === 'dark' ? 'dark' : 'light'
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
  return useMemo(() => factory(theme), [factory, theme])
}
