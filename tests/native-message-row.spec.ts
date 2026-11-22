import { createElement } from 'react'
import { act, cleanup, render } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

const dimensions = vi.hoisted(() => ({ width: 402 }))

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Platform: { OS: 'ios' },
  AccessibilityInfo: { announceForAccessibility: vi.fn() },
  useWindowDimensions: () => ({ width: dimensions.width, height: 874, fontScale: 1 }),
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
vi.mock('@/components/native-markdown', () => ({ NativeMarkdown: 'Markdown' }))
vi.mock('@/components/native-message-attachments', () => ({ NativeMessageAttachments: () => null }))
vi.mock('@/components/native-message-feedback', () => ({ NativeMessageFeedback: () => null }))
vi.mock('@/components/native-anchored-panel', () => ({ NativeAnchoredPanel: () => null }))
vi.mock('@/components/haptics', () => ({ tapFeedback: vi.fn() }))
vi.mock('expo-clipboard', () => ({ setStringAsync: vi.fn(async () => undefined) }))

import { MessageRow } from '@/components/session-message-row'

afterEach(() => {
  dimensions.width = 402
  return cleanup()
})

describe('MessageRow turn usage presentation', () => {
  const assistantItem = {
    kind: 'assistant' as const,
    text: 'Done.',
    time: new Date(2026, 10, 20, 22, 7).getTime(),
    usage: { totalTokens: 431_000, inputTokens: 400_000, outputTokens: 31_000, calls: 2 },
  }

  it('hides the inline token label below 480pt so the trailing timestamp fits without truncation', async () => {
    dimensions.width = 402
    const renderer = await render(
      createElement(MessageRow, {
        item: assistantItem,
        event: undefined,
        api: undefined,
        sessionId: 's1',
      }),
    )
    const texts = renderer.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => [].concat(node.props.children as never).join(''))
    expect(texts.some((value) => value.includes('用量'))).toBe(false)
    expect(
      renderer.container.queryAll(
        (node) => node.type === 'Pressable' && String(node.props.accessibilityLabel).includes('431K'),
      ),
    ).toHaveLength(1)
    await act(async () => undefined)
  })

  it('keeps the inline token label at tablet/desktop widths (480pt and above)', async () => {
    dimensions.width = 768
    const renderer = await render(
      createElement(MessageRow, {
        item: assistantItem,
        event: undefined,
        api: undefined,
        sessionId: 's1',
      }),
    )
    const texts = renderer.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => [].concat(node.props.children as never).join(''))
    expect(texts.some((value) => value.includes('用量'))).toBe(true)
    await act(async () => undefined)
  })
})
