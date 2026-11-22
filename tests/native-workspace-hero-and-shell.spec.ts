import { createElement } from 'react'
import { act, cleanup, render } from './support/native-testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Alert: { alert: vi.fn() },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'ios' },
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(true) },
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}))
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}))
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' },
  Easing: { bezier: () => () => 0 },
  cancelAnimation: vi.fn(),
  useAnimatedStyle: () => ({}),
  useSharedValue: (value: number) => ({ value }),
  withTiming: (value: number) => value,
}))
vi.mock('expo-router', () => ({
  router: { push: vi.fn(), replace: vi.fn() },
  useNavigation: () => ({ openDrawer: vi.fn() }),
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
vi.mock('@/components/native-brand-mark', () => ({ NativeBrandMark: 'BrandMark' }))
vi.mock('@/components/native-empty-state', () => ({ NativeEmptyState: 'EmptyState' }))
vi.mock('@/components/native-menu-panel', () => ({ NativeMenuPanel: 'MenuPanel' }))
vi.mock('@/components/session-screen-state', () => ({ ErrorNotice: 'ErrorNotice' }))
vi.mock('@/components/workspace-composer', () => ({ WorkspaceComposer: 'Composer' }))
vi.mock('@/state/connection', () => ({
  useConnectionStore: (selector: (state: unknown) => unknown) =>
    selector({ connection: { gatewayUrl: 'https://desktop.test', deviceId: 'phone', accessToken: 'token' } }),
}))
vi.mock('@/state/mobile-sync', () => ({
  useMobileSyncStore: Object.assign((selector: (state: unknown) => unknown) => selector({ status: 'connected' }), {
    getState: () => ({ restartStream: vi.fn() }),
  }),
}))
vi.mock('@/state/session-selection', () => ({
  useSessionSelectionStore: (selector: (state: unknown) => unknown) =>
    selector({
      selectedSessionId: undefined,
      clearSelection: vi.fn(),
      restoreSelection: vi.fn(),
    }),
}))

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MobileApi } from '@/api/mobile-api'
import { WorkspaceShell } from '@/components/workspace-shell'
import WorkspaceScreen from '@/features/workspace/workspace-screen'

let cache = new QueryClient()
const settle = async (): Promise<void> => {
  await act(async () => {
    for (let tick = 0; tick < 4; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(cleanup)

describe('WorkspaceShell title sizing', () => {
  it('uses 16/24 for panel sheets like Settings and 14/20 for ordinary headers', async () => {
    const header = await render(createElement(WorkspaceShell, { title: '工作区' }))
    const headerTitle = header.container.queryAll((node) => node.type === 'Text')[0]!
    expect(headerTitle.props.style[0].fontSize).toBe(14)
    expect(headerTitle.props.style[1]).toBe(false)

    const panel = await render(createElement(WorkspaceShell, { title: '设置', titleVariant: 'panel' }))
    const panelTitle = panel.container.queryAll((node) => node.type === 'Text')[0]!
    expect(panelTitle.props.style[1]).toEqual({ fontSize: 16, lineHeight: 24 })
  })
})

describe('WorkspaceScreen empty hero', () => {
  it('renders the centered 34px mark and preview badge before a session is selected', async () => {
    vi.spyOn(MobileApi.prototype, 'listSessions').mockResolvedValue({
      items: [{ sessionId: 's1', title: 'Task 1', updatedAt: 1 }],
      workspaces: [],
      archivedSessionIds: [],
      pinnedSessionIds: [],
    } as never)
    vi.spyOn(MobileApi.prototype, 'agentPresets').mockResolvedValue({ presets: [], authorable: false } as never)

    const renderer = await render(createElement(QueryClientProvider, { client: cache }, createElement(WorkspaceScreen)))
    await settle()

    const mark = renderer.container.queryAll((node) => node.type === 'BrandMark')[0]!
    expect(mark.props.size).toBe(34)

    const texts = renderer.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => [].concat(node.props.children as never).join(''))
    expect(texts).toContain('探索未至之境')
    expect(texts).toContain('预览版')
  })
})
