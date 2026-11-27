import { describe, expect, it, vi } from 'vitest'

const { getItem, setItem } = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(async () => undefined),
}))
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem, setItem },
}))

import { useAppearanceStore } from '@/state/appearance'

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

describe('useAppearanceStore initialization race', () => {
  it('deduplicates concurrent initialize calls and does not overwrite an explicit setPreference', async () => {
    let resolveStorage!: (value: string | null) => void
    getItem.mockImplementationOnce(() => new Promise<string | null>((resolve) => (resolveStorage = resolve)))
    useAppearanceStore.setState({ initialized: false, preference: 'system' })

    const p1 = useAppearanceStore.getState().initialize()
    const p2 = useAppearanceStore.getState().initialize()
    expect(getItem).toHaveBeenCalledTimes(1)

    await useAppearanceStore.getState().setPreference('dark')
    resolveStorage('light')
    await Promise.all([p1, p2])

    expect(useAppearanceStore.getState().preference).toBe('dark')
    expect(useAppearanceStore.getState().initialized).toBe(true)
  })
})
