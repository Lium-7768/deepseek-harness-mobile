import { createElement } from 'react'
import { act, cleanup, render, type RenderResult } from './support/native-testing'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Alert: { alert: vi.fn() },
  Platform: { OS: 'ios' },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(false),
    addEventListener: () => ({ remove: () => undefined }),
  },
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}))
vi.mock('expo-router', () => ({ router: { push: vi.fn(), replace: vi.fn() } }))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('react-native-svg', () => ({ Circle: 'Circle', default: 'Svg', SvgXml: 'SvgXml' }))
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react')
  return {
    default: { createAnimatedComponent: () => 'AnimatedCircle', View: 'AnimatedView' },
    cancelAnimation: () => undefined,
    Easing: { linear: 'linear' },
    interpolate: () => 0,
    useSharedValue: (initial: number) => useRef({ value: initial }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedProps: (factory: () => unknown) => factory(),
    withRepeat: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
vi.mock('@/components/native-anchored-panel', () => ({ NativeAnchoredPanel: 'AnchoredPanel' }))
vi.mock('@/components/native-action-button', () => ({ NativeActionButton: 'ActionButton' }))
vi.mock('@/components/native-selection', () => ({ NativeSelectionRow: 'SelectionRow' }))
vi.mock('@/components/native-list', () => ({ NativeSection: 'Section' }))
vi.mock('@/components/native-menu-panel', () => ({ NativeMenuPanel: 'MenuPanel' }))

import { MobileApi } from '@/api/mobile-api'
import { PresetSettings } from '@/components/settings/settings-presets'

const connection = { accessToken: 'token', deviceId: 'phone', gatewayUrl: 'https://desktop.test' } as never
let cache = new QueryClient()
const settle = async (): Promise<void> => {
  await act(async () => {
    for (let tick = 0; tick < 4; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
const texts = (renderer: RenderResult) =>
  renderer.container
    .queryAll((node) => node.type === 'Text')
    .map((node) => [].concat(node.props.children as never).join(''))

beforeEach(() => {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(cleanup)

describe('PresetSettings desktop alignment', () => {
  it('groups built-in and custom presets and shows raw preset ids on list rows', async () => {
    vi.spyOn(MobileApi.prototype, 'agentPresets').mockResolvedValue({
      authorable: false,
      presets: [
        { id: 'standard', isDefault: false },
        { id: 'ptc', isDefault: true },
        { id: 'team-helper', name: '团队助手', description: '自定义', isDefault: false },
      ],
    } as never)

    const renderer = await render(
      createElement(QueryClientProvider, { client: cache }, createElement(PresetSettings, { connection })),
    )
    await settle()

    const copy = texts(renderer)
    expect(copy).toContain('内置')
    expect(copy).toContain('自定义模式')
    expect(copy).toContain('standard')
    expect(copy).toContain('team-helper')
  })

  it('uses 16/24 medium heading and prints the preset id on the detail view', async () => {
    vi.spyOn(MobileApi.prototype, 'agentPresets').mockResolvedValue({
      authorable: false,
      presets: [{ id: 'standard', isDefault: true }],
    } as never)
    vi.spyOn(MobileApi.prototype, 'agentPreset').mockResolvedValue({
      id: 'standard',
      description: '标准描述',
      content: 'model: deepseek-chat',
    } as never)

    const renderer = await render(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(PresetSettings, { connection, selectedPreset: 'standard' }),
      ),
    )
    await settle()

    const heading = renderer.container.queryAll(
      (node) => node.type === 'Text' && node.props.children === '标准模式',
    )[0]!
    expect(heading.props.style).toEqual({
      color: 'rgb(15, 17, 21)',
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
    })
    expect(texts(renderer)).toContain('standard')
  })
})
