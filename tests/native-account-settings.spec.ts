import { createElement } from 'react'
import { act, render, cleanup, type RenderResult } from './support/native-testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ balance: vi.fn(), profile: vi.fn() }))
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Platform: { OS: 'ios' },
  useWindowDimensions: () => ({ fontScale: 1, height: 852, width: 393 }),
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('react-native-svg', () => ({ Circle: 'Circle', default: 'Svg', SvgXml: 'SvgXml' }))
// The settings loading state draws the branded running ring, which is Reanimated.
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
vi.mock('@/state/connection', () => ({
  useConnectionStore: (selector: (state: unknown) => unknown) =>
    selector({ connection: { accessToken: 'token', deviceId: 'phone', gatewayUrl: 'https://desktop.test' } }),
}))
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MobileApi } from '@/api/mobile-api'
import { AccountSettings } from '@/components/settings/settings-account'
import { SETTINGS_TABS, sectionTitle, settingsSectionIcon } from '@/components/settings-logic'

const connection = { accessToken: 'token', deviceId: 'phone', gatewayUrl: 'https://desktop.test' } as never
// A fresh cache per test: a shared one would serve an earlier test's result.
let cache = new QueryClient()
const newCache = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false } } })
/** The section reads through TanStack Query, so every render needs a provider. */
/**
 * Let the query pipeline settle inside act.
 *
 * A resolved fetch still passes through TanStack's notify and re-render steps,
 * so one microtask is not enough; the macrotask boundary drains all of them.
 */
const settle = async (): Promise<void> => {
  await act(async () => {
    for (let tick = 0; tick < 4; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
const mount = () =>
  createElement(QueryClientProvider, { client: cache }, createElement(AccountSettings, { connection }))
const texts = (renderer: RenderResult) =>
  renderer.container.queryAll((node) => node.type === 'Text').map((node) => [].concat(node.props.children).join(''))

beforeEach(() => {
  cache = newCache()
  mocks.profile.mockReset()
  mocks.balance.mockReset()
  vi.spyOn(MobileApi.prototype, 'accountProfile').mockImplementation(mocks.profile)
  vi.spyOn(MobileApi.prototype, 'accountBalance').mockImplementation(mocks.balance)
})
afterEach(cleanup)

describe('account settings section', () => {
  it('leads the tab bar, matching the desktop order -10', () => {
    expect(SETTINGS_TABS[0]).toBe('account')
    expect(sectionTitle('account')).toBe('账号与余额')
    expect(settingsSectionIcon('account')).toBe('user-outline')
  })

  it('shows the signed-out state and reads no balance', async () => {
    mocks.profile.mockResolvedValue(null)
    const renderer = await render(mount())
    await settle()
    expect(texts(renderer)).toContain('桌面端尚未登录 DeepSeek 账号。')
    expect(mocks.balance).not.toHaveBeenCalled()
  })

  it('prints the identity and the formatted wallets once signed in', async () => {
    mocks.profile.mockResolvedValue({
      avatarUrl: null,
      contact: 'l***@example.com',
      name: 'Phone Owner',
    })
    mocks.balance.mockResolvedValue({
      bonusWallets: [{ balance: '5', currency: 'CNY' }],
      wallets: [{ balance: '1234.5', currency: 'CNY' }],
    })
    const renderer = await render(mount())
    await settle()
    const copy = texts(renderer)
    expect(copy).toContain('Phone Owner')
    expect(copy).toContain('l***@example.com')
    expect(copy).toContain('¥1,234.50')
    expect(copy).toContain('¥5.00')
    // Read-only: the section says where changes belong instead of offering them.
    expect(copy).toContain('只读：登录、退出与奖励领取请在桌面端操作。')
  })
})
