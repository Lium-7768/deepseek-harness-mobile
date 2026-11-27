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
import { NativeMentionMenu } from '@/components/native-mention-menu'
import { NativeSessionCatalogSheet } from '@/components/native-session-catalog-sheet'
import { t as message } from '@/locale'
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

describe('NativeMentionMenu debounce loading state', () => {
  it('shows loading instead of empty while the initial lookup debounce is pending', async () => {
    const lookup = vi.fn(() => new Promise<{ files: []; sessions: [] }>(() => undefined))
    const renderer = await render(
      createElement(NativeMentionMenu, {
        text: '@app',
        caret: 4,
        lookup,
        onClose: vi.fn(),
        onPick: vi.fn(),
      }),
    )
    const texts = renderer.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => [].concat(node.props.children as never).join(''))
    expect(texts).toContain(message('mention.loading'))
    expect(texts).not.toContain(message('mention.empty'))
    await act(async () => undefined)
  })
})

describe('NativeSessionCatalogSheet localization', () => {
  it('localizes diagnostic reasons and failed/stopping job statuses', async () => {
    const renderer = await render(
      createElement(NativeSessionCatalogSheet, {
        open: true,
        onClose: vi.fn(),
        onOpenSubagent: vi.fn(),
        subagents: [{ kind: 'diagnostic', id: 'child-1', reason: 'corrupt' }],
        jobs: [
          { id: 'j1', kind: 'shell', label: 'build', status: 'failed', startedAt: 1_700_000_000_000 },
          { id: 'j2', kind: 'shell', label: 'watch', status: 'stopping', startedAt: 1_700_000_000_000 },
        ],
      }),
    )
    const texts = renderer.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => [].concat(node.props.children as never).join(''))
    expect(texts.some((t) => t.includes('记录损坏'))).toBe(true)
    expect(texts.some((t) => t.includes('corrupt'))).toBe(false)
    expect(texts).toContain('已失败')
    expect(texts).toContain('正在停止')
    await act(async () => undefined)
  })
})
