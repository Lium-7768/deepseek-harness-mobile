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
vi.mock('@/components/native-anchored-panel', () => ({
  NativeAnchoredPanel: (props: { open: boolean; children: unknown }) => (props.open ? props.children : null),
}))
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

  it('renders desktop-matching cache, reasoning, and model route breakdown in the usage panel', async () => {
    const { fireEvent } = await import('./support/native-testing')
    const renderer = await render(
      createElement(MessageRow, {
        item: {
          ...assistantItem,
          usage: {
            totalTokens: 1_200,
            inputTokens: 1_000,
            outputTokens: 200,
            cacheReadTokens: 800,
            cacheWriteTokens: 50,
            reasoningTokens: 120,
            calls: 2,
            routes: [{ provider: 'deepseek', model: 'deepseek-reasoner' }],
          },
        },
        event: undefined,
        api: undefined,
        sessionId: 's1',
      }),
    )
    const trigger = renderer.container.queryAll(
      (node) => node.type === 'Pressable' && String(node.props.accessibilityLabel).includes('1.2K'),
    )[0]!
    await act(async () => {
      fireEvent.press(trigger)
    })
    const joined = renderer.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => [].concat(node.props.children as never).join(''))
      .join(' | ')
    expect(joined).toContain('本轮用量')
    expect(joined).toContain('提供方 / 模型')
    expect(joined).toContain('deepseek/deepseek-reasoner')
    expect(joined).toContain('缓存命中')
    expect(joined).toContain('80%')
    expect(joined).toContain('未缓存输入')
    expect(joined).toContain('缓存读取')
    expect(joined).toContain('缓存写入')
    expect(joined).toContain('其中推理')
    expect(joined).toContain('请求次数')
  })
})
