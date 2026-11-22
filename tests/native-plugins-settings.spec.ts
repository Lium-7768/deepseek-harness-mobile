import { createElement } from 'react'
import { act, cleanup, render, type RenderResult } from './support/native-testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    Platform: { OS: 'ios' },
    AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
    AccessibilityInfo: {
      isReduceMotionEnabled: () => Promise.resolve(false),
      addEventListener: () => ({ remove: () => undefined }),
    },
    StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
    FlatList: (props: {
      data: unknown[]
      ListHeaderComponent?: unknown
      ListEmptyComponent?: unknown
      renderItem: (args: { item: unknown }) => unknown
    }) =>
      createElement(
        'FlatList',
        null,
        props.ListHeaderComponent as never,
        ...(props.data.length
          ? props.data.map((item, index) =>
              createElement('ListRow', { key: index }, props.renderItem({ item }) as never),
            )
          : [props.ListEmptyComponent as never]),
      ),
  }
})
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
vi.mock('@/components/native-action-button', () => ({ NativeActionButton: 'ActionButton' }))
vi.mock('@/components/native-selection', () => ({ NativeSelectionRow: 'SelectionRow' }))
vi.mock('@/components/native-list', () => ({ NativeSection: 'Section' }))
vi.mock('@/components/native-menu-panel', () => ({ NativeMenuPanel: 'MenuPanel' }))

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MobileApi } from '@/api/mobile-api'
import { PluginSettings } from '@/components/settings/settings-plugins'

const connection = { accessToken: 'token', deviceId: 'phone', gatewayUrl: 'https://desktop.test' } as never
let cache = new QueryClient()
let renderer: RenderResult

const settle = async (): Promise<void> => {
  await act(async () => {
    for (let tick = 0; tick < 4; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(cleanup)

describe('plugin settings search clear control', () => {
  it('shows a clear button while filtering and clears the query on press', async () => {
    vi.spyOn(MobileApi.prototype, 'settingsDescribe').mockResolvedValue({
      writable: false,
      namespaces: [
        { ns: 'bash-sandbox', applies: 'live' },
        { ns: 'agent-loop', applies: 'live' },
      ],
    } as never)
    renderer = await render(
      createElement(QueryClientProvider, { client: cache }, createElement(PluginSettings, { connection })),
    )
    await settle()
    expect(
      renderer.container.queryAll((node) => node.type === 'Pressable' && node.props.accessibilityLabel === '清除搜索'),
    ).toHaveLength(0)

    const input = renderer.container.queryAll((node) => node.type === 'TextInput')[0]!
    await act(async () => {
      input.props.onChangeText('bash')
    })
    const clear = renderer.container.queryAll(
      (node) => node.type === 'Pressable' && node.props.accessibilityLabel === '清除搜索',
    )[0]!
    expect(clear).toBeDefined()
    expect(renderer.container.queryAll((node) => node.type === 'ListRow')).toHaveLength(1)

    await act(async () => {
      clear.props.onPress()
    })
    expect(renderer.container.queryAll((node) => node.type === 'TextInput')[0]!.props.value).toBe('')
    expect(renderer.container.queryAll((node) => node.type === 'ListRow')).toHaveLength(2)
  })
})
