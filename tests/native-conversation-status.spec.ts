import { createElement } from 'react'
import { act, cleanup, fireEvent, render } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View',
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
vi.mock('@/components/native-flow-row', () => ({ NativeFlowRow: 'FlowRow' }))
vi.mock('@/components/native-markdown', () => ({ NativeMarkdown: 'Markdown' }))
vi.mock('@/components/native-anchored-panel', () => ({
  NativeAnchoredPanel: (props: { open: boolean; children: unknown }) => (props.open ? props.children : null),
}))
vi.mock('@/components/haptics', () => ({ tapFeedback: vi.fn() }))
vi.mock('@/state/snackbar', () => ({ showSnackbar: vi.fn() }))
vi.mock('expo-clipboard', () => ({ setStringAsync: vi.fn(async () => undefined) }))

import {
  NativeCommandRow,
  NativeCompactionRow,
  NativeReasoningRow,
  NativeTurnMaxTokensRow,
  NativeTurnStatus,
} from '@/components/native-conversation-status'
import { NativeTurnTriggerRow } from '@/components/native-turn-trigger-row'

afterEach(cleanup)

describe('desktop-aligned conversation status and trigger rows', () => {
  it('skips empty or whitespace-only reasoning rows', async () => {
    const empty = await render(
      createElement(NativeReasoningRow, { row: { kind: 'reasoning', text: '   ', sourceSeq: 1 } }),
    )
    expect(empty.container.queryAll((node) => node.type === 'FlowRow')).toHaveLength(0)
    await act(async () => undefined)
  })

  it('renders compaction via NativeFlowRow with desktop title, count summary, and compact markdown', async () => {
    const rendered = await render(
      createElement(NativeCompactionRow, {
        row: {
          kind: 'compaction',
          shadowedItemCount: 12,
          shadowedTokenCount: 4800,
          summary: '## 摘要\n保留关键结论',
          sourceSeq: 2,
        },
      }),
    )
    const flowRow = rendered.container.queryAll((node) => node.type === 'FlowRow')[0]
    expect(flowRow?.props.title).toBe('上下文已压缩')
    expect(flowRow?.props.summary).toBe('已压缩 12 条历史记录（约 4800 tokens）')
    expect(flowRow?.props.keepContentWhenOpen).toBe(true)
    expect(flowRow?.props.expandable).toBe(true)
    await act(async () => undefined)
  })

  it('renders commands via NativeFlowRow with desktop status copy and error tone', async () => {
    const running = await render(
      createElement(NativeCommandRow, {
        row: { kind: 'command', name: 'compact', state: 'running', sourceSeq: 3 },
      }),
    )
    const runningRow = running.container.queryAll((node) => node.type === 'FlowRow')[0]
    expect(runningRow?.props.title).toBe('compact')
    expect(runningRow?.props.summary).toBe('执行中…')
    expect(runningRow?.props.expandable).toBe(false)

    const failed = await render(
      createElement(NativeCommandRow, {
        row: { kind: 'command', name: 'git-sync', state: 'error', text: 'first line\nsecond line', sourceSeq: 4 },
      }),
    )
    const failedRow = failed.container.queryAll((node) => node.type === 'FlowRow')[0]
    expect(failedRow?.props.tone).toBe('danger')
    expect(failedRow?.props.summary).toBe('first line')
    expect(failedRow?.props.expandable).toBe(true)
    await act(async () => undefined)
  })

  it('renders max-tokens notice with desktop title and continuation hint', async () => {
    const rendered = await render(createElement(NativeTurnMaxTokensRow))
    const text = rendered.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => [].concat(node.props.children as never).join(''))
      .join(' ')
    expect(text).toContain('已达到输出 token 上限')
    expect(text).toContain('回答被截断')
    await act(async () => undefined)
  })

  it('renders running status with tabular numerals and optional top divider', async () => {
    const plain = await render(createElement(NativeTurnStatus, { startedAt: Date.now() - 3_000 }))
    const withDivider = await render(
      createElement(NativeTurnStatus, { showDivider: true, startedAt: Date.now() - 3_000 }),
    )
    const plainViews = plain.container.queryAll((node) => node.type === 'View')
    const dividerViews = withDivider.container.queryAll((node) => node.type === 'View')
    expect(dividerViews.length).toBe(plainViews.length + 1)
    const statusText = withDivider.container.queryAll((node) => node.type === 'Text')[0]
    expect(statusText?.props.style?.fontVariant).toEqual(['tabular-nums'])

    const now = Date.now()
    await act(async () => {
      await withDivider.rerender(createElement(NativeTurnStatus, { showDivider: true, startedAt: now - 125_000 }))
    })
    const updatedText = String(withDivider.container.queryAll((node) => node.type === 'Text')[0]?.props.children)
    expect(updatedText).toContain('2分')
    await act(async () => undefined)
  })

  it('renders continue triggers inline without card chrome and shows explanation for ordinary triggers', async () => {
    const cont = await render(createElement(NativeTurnTriggerRow, { trigger: 'continue', text: 'auto' }))
    expect(cont.container.queryAll((node) => node.type === 'Pressable')).toHaveLength(0)

    const sched = await render(
      createElement(NativeTurnTriggerRow, {
        rowKey: 'turn-trigger:9',
        text: 'nightly check',
        time: new Date(2026, 10, 20, 9, 30).getTime(),
        trigger: 'schedule',
      }),
    )
    const initialIcons = sched.container.queryAll((node) => node.type === 'Icon').map((node) => node.props.name)
    expect(initialIcons).toContain('chevron-down-outline')
    const triggerBtn = sched.container.queryAll((node) => node.type === 'Pressable')[0]!
    await act(async () => {
      fireEvent.press(triggerBtn)
    })
    const openIcons = sched.container.queryAll((node) => node.type === 'Icon').map((node) => node.props.name)
    expect(openIcons).toContain('chevron-up-outline')
    const joined = sched.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => [].concat(node.props.children as never).join(''))
      .join(' | ')
    expect(joined).toContain('09:30')
    expect(joined).toContain('这条通知触发了本轮回复。')
    expect(joined).toContain('nightly check')
  })
})
