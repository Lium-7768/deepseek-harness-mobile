import { describe, expect, it } from 'vitest'

import { isAppearancePreference as isPreference, resolveAppearance as resolve } from '@/state/appearance-logic'

describe('appearance preference', () => {
  it('accepts the three offered values and rejects anything stored earlier', () => {
    expect(isPreference('light')).toBe(true)
    expect(isPreference('dark')).toBe(true)
    expect(isPreference('system')).toBe(true)
    expect(isPreference('auto')).toBe(false)
    expect(isPreference(undefined)).toBe(false)
  })

  it('follows the operating system only while the preference says so', () => {
    expect(resolve('system', 'dark')).toBe('dark')
    expect(resolve('system', 'light')).toBe('light')
    // A null scheme is what `useColorScheme()` reports before the first layout.
    expect(resolve('system', null)).toBe('light')
  })

  it('keeps an explicit choice whatever the operating system reports', () => {
    expect(resolve('dark', 'light')).toBe('dark')
    expect(resolve('light', 'dark')).toBe('light')
  })
})
