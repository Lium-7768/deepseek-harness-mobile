import type { Appearance } from '@/theme'

export type AppearancePreference = Appearance | 'system'

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function resolveAppearance(preference: AppearancePreference, scheme: string | null | undefined): Appearance {
  return preference === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : preference
}
