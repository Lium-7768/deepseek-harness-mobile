import { createElement } from 'react'
import { act, cleanup, render } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
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
vi.mock('@/components/native-anchored-panel', async () => {
  const { createElement } = await import('react')
  return {
    NativeAnchoredPanel: (props: { open: boolean; children: unknown }) =>
      props.open ? createElement('Panel', null, props.children as never) : null,
  }
})

import { NativeMenuPanel } from '@/components/native-menu-panel'
import { ConversationLeadingBlocks } from '@/features/session/conversation-leading-blocks'

afterEach(cleanup)

describe('ConversationLeadingBlocks loading guard', () => {
  const baseProps = {
    tasks: [],
    sourceItems: [],
    jobs: [],
    subagents: [],
    interruptingId: undefined,
    hasMoreHistory: false,
    olderState: { pending: false, failed: false },
    onLoadOlder: vi.fn(),
    onOpenSubagent: vi.fn(),
    onInterruptSubagent: vi.fn(),
  }

  it('hides the history-start notice while the initial transcript is pending or empty', async () => {
    const renderer = await render(createElement(ConversationLeadingBlocks, { ...baseProps, showOlderControl: false }))
    const texts = renderer.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => [].concat(node.props.children as never).join(''))
    expect(texts).not.toContain('已到会话开头')
    await act(async () => undefined)
  })

  it('shows the history-start notice once messages are present', async () => {
    const renderer = await render(createElement(ConversationLeadingBlocks, { ...baseProps, showOlderControl: true }))
    const texts = renderer.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => [].concat(node.props.children as never).join(''))
    expect(texts).toContain('已到会话开头')
    await act(async () => undefined)
  })
})

describe('NativeMenuPanel viewport sizing', () => {
  it('delegates maxHeight to NativeAnchoredPanel instead of hardcoding 480', async () => {
    const renderer = await render(
      createElement(NativeMenuPanel, {
        open: true,
        onClose: vi.fn(),
        groups: [{ options: [{ label: '仅显示已归档', value: 'only' }] }],
      }),
    )
    const menu = renderer.container.queryAll(
      (node) => node.type === 'View' && node.props.style?.paddingVertical === 8,
    )[0]!
    expect(menu.props.style.maxHeight).toBeUndefined()
    await act(async () => undefined)
  })
})
