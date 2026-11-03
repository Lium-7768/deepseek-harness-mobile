import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reduced: undefined as ((value: boolean) => void) | undefined,
  appState: undefined as ((value: string) => void) | undefined,
  readReduced: vi.fn(),
  removeReduced: vi.fn(),
  removeAppState: vi.fn(),
  timing: vi.fn(() => 1),
  repeat: vi.fn(() => 0),
  cancel: vi.fn(),
}))
vi.mock('@/theme/hooks', () => ({ useAppTheme: () => ({ colors: { inkTertiary: '#777' } }) }))
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle' }))
vi.mock('react-native', () => ({
  AccessibilityInfo: {
    isReduceMotionEnabled: mocks.readReduced,
    addEventListener: (_: string, listener: (value: boolean) => void) => {
      mocks.reduced = listener
      return { remove: mocks.removeReduced }
    },
  },
  AppState: {
    currentState: 'active',
    addEventListener: (_: string, listener: (value: string) => void) => {
      mocks.appState = listener
      return { remove: mocks.removeAppState }
    },
  },
}))
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react')
  return {
    default: { createAnimatedComponent: () => 'AnimatedCircle', View: 'AnimatedView' },
    cancelAnimation: mocks.cancel,
    Easing: { linear: 'linear' },
    interpolate: (_: number, _range: number[], output: number[]) => output[0],
    useSharedValue: (initial: number) => useRef({ value: initial }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedProps: (factory: () => unknown) => factory(),
    withTiming: mocks.timing,
    withRepeat: mocks.repeat,
  }
})
import { NativeRunningRing } from '@/components/native-running-ring'

let renderer: ReactTestRenderer
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks()
  mocks.readReduced.mockResolvedValue(false)
})
afterEach(async () => {
  await act(() => renderer.unmount())
  vi.unstubAllGlobals()
})

describe('native running ring lifecycle', () => {
  it('runs the arc/rotation through Reanimated and stops for reduced motion and backgrounding', async () => {
    await act(async () => {
      renderer = create(createElement(NativeRunningRing))
    })
    expect(mocks.timing).toHaveBeenCalledExactlyOnceWith(1, { duration: 1500, easing: 'linear' })
    expect(mocks.repeat).toHaveBeenCalledWith(1, -1)
    expect(renderer.root.findByType('AnimatedCircle').props.animatedProps).toEqual({
      strokeDasharray: [12, 150],
      strokeDashoffset: 0,
    })
    await act(async () => {
      mocks.reduced!(true)
    })
    expect(mocks.timing).toHaveBeenCalledTimes(1)
    expect(mocks.cancel).toHaveBeenCalled()
    await act(async () => {
      mocks.reduced!(false)
    })
    expect(mocks.timing).toHaveBeenCalledTimes(2)
    await act(async () => {
      mocks.appState!('background')
    })
    expect(mocks.timing).toHaveBeenCalledTimes(2)
    await act(async () => {
      mocks.appState!('active')
    })
    expect(mocks.timing).toHaveBeenCalledTimes(3)
    await act(() => renderer.unmount())
    expect(mocks.removeReduced).toHaveBeenCalledTimes(1)
    expect(mocks.removeAppState).toHaveBeenCalledTimes(1)
  })
  it('never starts an animation when the system already requests reduced motion', async () => {
    mocks.readReduced.mockResolvedValue(true)
    await act(async () => {
      renderer = create(createElement(NativeRunningRing))
    })
    expect(mocks.timing).not.toHaveBeenCalled()
  })
})
