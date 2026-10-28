/**
 * React bindings for the mobile theme.
 *
 * Kept apart from `./index.ts` so that pure logic modules — the `*-logic.ts`
 * helpers and their tests — can import tokens without pulling React Native's
 * runtime into a Node test process.
 */
import { useMemo } from 'react'
import { Easing, useColorScheme } from 'react-native'
import { mobileTheme, themes, type AppTheme, type Appearance } from './index'

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

/**
 * The desktop's easing curve as an RN easing function.
 *
 * `cubic-bezier(0.4, 0, 0.2, 1)` is the value behind `--ds-ease-in-out`; it lives
 * as control points in the token module so logic tests can read it without
 * loading react-native.
 *
 * @returns An easing function for `Animated.timing`.
 */
export function useMotionEasing(): (value: number) => number {
  return useMemo(() => Easing.bezier(...mobileTheme.motion.bezier), [])
}
