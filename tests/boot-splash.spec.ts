import { createElement } from 'react'
import { act, render, cleanup, type RenderResult } from './support/native-testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ reduced: vi.fn(async () => false) }))
vi.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles },
  AccessibilityInfo: {
    isReduceMotionEnabled: mocks.reduced,
    addEventListener: () => ({ remove: () => undefined }),
  },
  Platform: { OS: 'ios' },
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('expo-splash-screen', () => ({ hideAsync: async () => undefined, preventAutoHideAsync: async () => undefined }))
vi.mock('@/components/native-whale-mark', () => ({ NativeWhaleMark: 'WhaleMark' }))
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react')
  return {
    default: { View: 'AnimatedView' },
    cancelAnimation: () => undefined,
    Easing: { bezier: () => 'bezier' },
    runOnJS: (fn: () => void) => fn,
    useSharedValue: (initial: number) => useRef({ value: initial }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: unknown) => value,
    withDelay: (_delay: number, value: unknown) => value,
  }
})

import { coverHoldMs, ENTER_MS, MIN_READY_HOLD_MS, WARM_UP_MS } from '@/components/boot-splash-logic'
import { BootSplash } from '@/components/boot-splash'

let renderer: RenderResult
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  mocks.reduced.mockResolvedValue(false)
})
afterEach(async () => {
  await cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const covers = () => renderer.container.queryAll((node) => node.type === 'AnimatedView')

describe('launch cover', () => {
  it('draws the brand mark over the first frame and leaves once the app is ready', async () => {
    await act(async () => {
      renderer = await render(createElement(BootSplash, { ready: false }))
    })
    // The cover and the mark's own animated wrapper.
    expect(covers().length).toBeGreaterThanOrEqual(1)
    expect(renderer.container.queryAll((node) => node.type === 'WhaleMark')).toHaveLength(1)
  })

  it('stays up until the mark has landed even when readiness arrives immediately', async () => {
    await act(async () => {
      renderer = await render(createElement(BootSplash, { ready: true }))
    })
    // First commit: the cover is still there; its exit is scheduled behind the floor
    // measured from mount, so a warm start still shows the mark.
    expect(covers().length).toBeGreaterThanOrEqual(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(covers().length).toBeGreaterThanOrEqual(1)
  })
})

describe('cover budget', () => {
  it('spends the whole gesture when readiness is immediate', () => {
    expect(coverHoldMs(0, 0)).toBe(WARM_UP_MS + Math.max(ENTER_MS + 100, MIN_READY_HOLD_MS))
  })

  it('shrinks by what the slow runtime start already played, and never below zero', () => {
    const total = WARM_UP_MS + Math.max(ENTER_MS + 100, MIN_READY_HOLD_MS)
    expect(coverHoldMs(0, total - 1_000)).toBe(1_000)
    expect(coverHoldMs(0, total)).toBe(0)
    expect(coverHoldMs(0, total + 5_000)).toBe(0)
  })
})
