import { createElement } from 'react'
import { act, cleanup, render } from './support/native-testing'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Modal: 'Modal',
  Alert: { alert: vi.fn() },
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.dark,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.dark),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
vi.mock('expo-image', () => ({ Image: 'ExpoImage' }))
vi.mock('expo-file-system', () => ({ File: vi.fn(), Paths: { cache: '/tmp' } }))
vi.mock('expo-sharing', () => ({ isAvailableAsync: vi.fn(async () => true), shareAsync: vi.fn() }))
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}))

import { darkTheme } from '@/theme'
import { NativeMessageAttachments } from '@/components/native-message-attachments'

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

describe('NativeMessageAttachments dark overlay contrast', () => {
  it('uses white onScrim ink for preview controls over the dark media backdrop', async () => {
    const api = {
      withSignal: () => ({
        readAttachment: async () => ({
          attachment: { attachmentId: 'att-1', mediaType: 'image/png', bytes: 128, width: 100, height: 100 },
          data: 'AA==',
        }),
      }),
    } as never
    const event = {
      data: {
        message: {
          content: [
            {
              type: 'image',
              attachment: {
                attachmentId: 'att-1',
                mediaType: 'image/png',
                bytes: 128,
                width: 100,
                height: 100,
                name: 'shot.png',
              },
            },
          ],
        },
      },
    }
    const renderer = await render(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(NativeMessageAttachments, { api, sessionId: 's1', event }),
      ),
    )
    await settle()

    const trigger = renderer.container.queryAll(
      (node) => node.type === 'Pressable' && String(node.props.accessibilityLabel).includes('shot.png'),
    )[0]!
    await act(async () => {
      trigger.props.onPress()
    })

    const closeIcon = renderer.container.queryAll(
      (node) => node.type === 'Icon' && node.props.name === 'close-outline',
    )[0]!
    const shareIcon = renderer.container.queryAll(
      (node) => node.type === 'Icon' && node.props.name === 'link-outline',
    )[0]!
    const caption = renderer.container.queryAll(
      (node) => node.type === 'Text' && node.props.children === 'shot.png',
    )[0]!
    const shareLabel = renderer.container.queryAll(
      (node) => node.type === 'Text' && node.props.children === '分享或保存',
    )[0]!

    const closeButton = renderer.container.queryAll(
      (node) => node.type === 'Pressable' && node.props.accessibilityLabel === '关闭图片预览',
    )[0]!
    const footer = renderer.container.queryAll(
      (node) =>
        node.type === 'View' &&
        Array.isArray(node.props.style) &&
        node.props.style.some((s: Record<string, unknown>) => s && 'paddingBottom' in s),
    )[0]!

    expect(closeIcon.props.color).toBe(darkTheme.colors.onScrim)
    expect(shareIcon.props.color).toBe(darkTheme.colors.onScrim)
    expect(caption.props.style.color).toBe(darkTheme.colors.onScrim)
    expect(shareLabel.props.style.color).toBe(darkTheme.colors.onScrim)
    expect(closeButton.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ right: 16, top: 67 })]))
    expect(footer.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ paddingBottom: 34 })]))
  })
})
