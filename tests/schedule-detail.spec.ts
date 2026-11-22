import { createElement } from 'react'
import { act, cleanup, render, type RenderResult } from './support/native-testing'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'ios' },
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}))
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))
vi.mock('expo-router', () => ({ router: { push: vi.fn(), replace: vi.fn() } }))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
vi.mock('@/components/native-running-ring', () => ({ NativeRunningRing: 'RunningRing' }))
vi.mock('@/components/session-screen-state', () => ({ ErrorNotice: 'ErrorNotice' }))
vi.mock('@/components/native-menu-panel', () => ({ NativeMenuPanel: 'MenuPanel' }))
vi.mock('@/components/confirm-sheet', () => ({
  ConfirmSheet: (props: Record<string, unknown>) => (props.open ? createElement('ConfirmSheet', props) : null),
}))
vi.mock('@/components/native-action-button', () => ({
  NativeActionButton: (props: Record<string, unknown>) => createElement('ActionButton', props),
}))

import { MobileApiError } from '@/api/mobile-api'
import { ScheduleDetailModal } from '@/components/schedule-detail'
import type { MobileScheduleEntry } from '@/types/mobile'

let cache = new QueryClient()
const settle = async (): Promise<void> => {
  await act(async () => {
    for (let tick = 0; tick < 5; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
const texts = (renderer: RenderResult) =>
  renderer.container
    .queryAll((node) => node.type === 'Text')
    .map((node) => [].concat(node.props.children as never).join(''))

const sampleTask: MobileScheduleEntry = {
  id: 'task-1',
  kind: 'daily',
  title: '每日进度检查',
  prompt: '总结昨天进展',
  status: 'active',
  scheduledAt: '2026-11-23T01:00:00.000Z',
  updatedAt: '2026-11-22T01:00:00.000Z',
  time: '09:00:00.000',
  timeZone: 'Asia/Shanghai',
  target: { kind: 'new_once', sessionId: 'session-1' },
}

beforeEach(() => {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(cleanup)

describe('ScheduleDetailModal', () => {
  it('renders rule summary, target session action, and submits edits with CAS expectedUpdatedAt', async () => {
    const editSchedule = vi.fn().mockResolvedValue({ ...sampleTask, title: '每日进度更新', updatedAt: 'v2' })
    const api = {
      withSignal: () => ({
        viewSchedule: vi.fn().mockResolvedValue(sampleTask),
        scheduleHistory: vi.fn().mockResolvedValue({
          id: 'task-1',
          records: [],
          earlierRecordsUnavailable: false,
          earlierRecordsPruned: false,
          retention: { days: 30, records: 100 },
        }),
      }),
      editSchedule,
      runSchedule: vi.fn().mockResolvedValue(sampleTask),
      updateSchedule: vi.fn().mockResolvedValue(undefined),
    } as never

    const renderer = await render(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(ScheduleDetailModal, { api, initialTask: sampleTask, onClose: vi.fn() }),
      ),
    )
    await settle()

    expect(texts(renderer)).toContain('每天 09:00')
    expect(texts(renderer)).toContain('打开目标会话')

    const titleInput = renderer.container.queryAll(
      (node) => node.type === 'TextInput' && node.props.accessibilityLabel === '任务名称',
    )[0]!
    await act(async () => {
      titleInput.props.onChangeText('每日进度更新')
    })

    const saveBtn = renderer.container.queryAll(
      (node) => node.type === 'ActionButton' && node.props.label === '保存更改',
    )[0]!
    await act(async () => {
      saveBtn.props.onPress()
    })
    await settle()

    expect(editSchedule).toHaveBeenCalledWith('task-1', { title: '每日进度更新' }, '2026-11-22T01:00:00.000Z')
  })

  it('surfaces CAS conflict recovery and loads delivery records when switching tabs', async () => {
    const scheduleHistory = vi.fn().mockResolvedValue({
      id: 'task-1',
      records: [
        {
          scheduledAt: '2026-11-22T01:00:00.000Z',
          deliveredAt: '2026-11-22T01:00:02.000Z',
          messageId: 'msg-1',
          targetSessionId: 'session-1',
          prompt: '总结昨天进展',
        },
      ],
      earlierRecordsUnavailable: false,
      earlierRecordsPruned: false,
      retention: { days: 30, records: 100 },
    })
    const runSchedule = vi.fn().mockResolvedValue(sampleTask)
    const api = {
      withSignal: () => ({
        viewSchedule: vi.fn().mockResolvedValue(sampleTask),
        scheduleHistory,
      }),
      editSchedule: vi.fn().mockRejectedValue(new MobileApiError('schedule-conflict', '任务已被修改，请刷新后重试。')),
      runSchedule,
      updateSchedule: vi.fn().mockResolvedValue(undefined),
    } as never

    const renderer = await render(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(ScheduleDetailModal, { api, initialTask: sampleTask, onClose: vi.fn() }),
      ),
    )
    await settle()

    const titleInput = renderer.container.queryAll(
      (node) => node.type === 'TextInput' && node.props.accessibilityLabel === '任务名称',
    )[0]!
    await act(async () => {
      titleInput.props.onChangeText('冲突标题')
    })
    const saveBtn = renderer.container.queryAll(
      (node) => node.type === 'ActionButton' && node.props.label === '保存更改',
    )[0]!
    await act(async () => {
      saveBtn.props.onPress()
    })
    await settle()

    expect(texts(renderer)).toContain('任务已被修改，请刷新后重试。')
    expect(texts(renderer)).toContain('重新加载')

    const recordsTab = renderer.container.queryAll(
      (node) => node.type === 'Pressable' && node.props.accessibilityRole === 'tab',
    )[1]!
    await act(async () => {
      recordsTab.props.onPress()
    })
    await settle()

    expect(scheduleHistory).toHaveBeenCalledWith('task-1', { limit: 20 })
    expect(texts(renderer)).toContain('总结昨天进展')
    expect(texts(renderer)).toContain('查看会话')
  })
})
