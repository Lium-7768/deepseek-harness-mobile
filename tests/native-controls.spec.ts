import { createElement, type ReactElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileApi, MobileApiError } from '@/api/mobile-api'
import type { MobileScheduleEntry } from '@/types/mobile'

const mocks = vi.hoisted(() => ({ alert: vi.fn() }))
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Alert: { alert: mocks.alert },
  useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }),
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
vi.mock('@/components/native-action-button', () => ({ NativeActionButton: 'ActionButton' }))
vi.mock('@/components/workspace-shell', () => ({ WorkspaceShell: 'Shell' }))
vi.mock('@/components/session-screen-state', () => ({ ErrorNotice: 'ErrorNotice' }))
vi.mock('@/components/native-anchored-panel', async () => {
  const { createElement } = await import('react')
  return { NativeAnchoredPanel: (props: { open: boolean }) => (props.open ? createElement('Panel', props) : null) }
})
vi.mock('@/hooks/use-screen-active', () => ({ useScreenActive: () => true }))
vi.mock('@/state/connection', () => ({
  useConnectionStore: (selector: (state: unknown) => unknown) =>
    selector({
      connection: { gatewayUrl: 'https://desktop.test', deviceId: 'phone', accessToken: 'test' },
    }),
}))
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }))

import SchedulesScreen from '@/features/schedules/schedules-screen'
import { NativeGoalEditor } from '@/components/native-goal-editor'
import { NativeGoalBar } from '@/components/native-goal-bar'
import { useSessionActions } from '@/features/session/use-session-actions'
import { queryKeys } from '@/api/query-keys'

let renderer: ReactTestRenderer
let cache: QueryClient
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  mocks.alert.mockClear()
})
afterEach(async () => {
  if (renderer) await act(() => renderer.unmount())
  cache.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function mount(element: ReactElement) {
  await act(async () => {
    renderer = create(element)
  })
}
async function settle(until: () => boolean) {
  const deadline = Date.now() + 1000
  while (!until() && Date.now() < deadline)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  expect(until()).toBe(true)
}
function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const task = (status: 'active' | 'paused'): MobileScheduleEntry => ({
  id: status,
  title: status,
  prompt: 'Review the workspace',
  status,
  scheduledAt: '2026-11-04T10:00:00Z',
  updatedAt: 'v1',
  target: { kind: 'new' },
})
const buttons = () => renderer.root.findAllByType('ActionButton')
const button = (label: string) => buttons().find((node) => node.props.label === label)!

describe('automation screen interaction', () => {
  it.each(['network', 'credentials', 'timeout', 'unsupported'] as const)(
    'shows an accurate %s failure and offers a working retry',
    async (kind) => {
      const schedules = vi
        .spyOn(MobileApi.prototype, 'schedules')
        .mockRejectedValueOnce(new MobileApiError(kind, '测试错误'))
        .mockResolvedValue({ items: [] })
      await mount(createElement(QueryClientProvider, { client: cache }, createElement(SchedulesScreen)))
      await settle(() => renderer.root.findAllByType('ErrorNotice').length === 1)
      const notice = renderer.root.findByType('ErrorNotice')
      expect(notice.props.text).toContain(kind === 'unsupported' ? '未提供自动化任务目录' : '自动化任务加载失败')
      if (kind !== 'unsupported') expect(notice.props.text).not.toContain('请更新手机访问插件')
      await act(async () => {
        notice.props.onRetry()
      })
      await settle(() => renderer.root.findAllByType('ErrorNotice').length === 0)
      expect(schedules).toHaveBeenCalledTimes(2)
    },
  )
  it('serializes pause/resume/delete before rerender, confirms deletion, and releases the gate after failure', async () => {
    vi.spyOn(MobileApi.prototype, 'schedules').mockResolvedValue({ items: [task('active'), task('paused')] })
    const update = vi.spyOn(MobileApi.prototype, 'updateSchedule')
    const first = deferred()
    update.mockReturnValueOnce(first.promise)
    await mount(createElement(QueryClientProvider, { client: cache }, createElement(SchedulesScreen)))
    await settle(() => buttons().length === 4)
    await act(async () => {
      button('暂停任务').props.onPress()
      button('恢复任务').props.onPress()
    })
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenLastCalledWith(task('active'), 'pause')
    await settle(() => buttons().every((node) => node.props.disabled))
    await act(async () => {
      first.reject(new Error('failed'))
    })
    await settle(() => !button('恢复任务').props.disabled)
    expect(mocks.alert).toHaveBeenCalledWith('任务操作失败', 'failed')
    const second = deferred()
    update.mockReturnValueOnce(second.promise)
    await act(async () => {
      button('恢复任务').props.onPress()
    })
    expect(update).toHaveBeenLastCalledWith(task('paused'), 'resume')
    await act(async () => {
      second.resolve()
    })
    await settle(() => !button('删除任务').props.disabled)
    mocks.alert.mockClear()
    await act(async () => {
      button('删除任务').props.onPress()
    })
    expect(update).toHaveBeenCalledTimes(2)
    const choices = mocks.alert.mock.calls[0][2]
    expect(choices[0].style).toBe('cancel')
    expect(choices[1].style).toBe('destructive')
    const third = deferred()
    update.mockReturnValueOnce(third.promise)
    await act(async () => {
      choices[1].onPress()
      choices[1].onPress()
    })
    expect(update).toHaveBeenCalledTimes(3)
    expect(update).toHaveBeenLastCalledWith(task('active'), 'delete')
    await act(async () => {
      third.resolve()
    })
    await settle(() => !button('删除任务').props.disabled)
  })
})

describe('Goal editor interaction', () => {
  it('retains the draft on failure, blocks duplicate saves and all dismiss paths, then closes after retry', async () => {
    const first = deferred()
    const onCreate = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(undefined)
    const onClose = vi.fn()
    await mount(createElement(NativeGoalEditor, { open: true, pending: false, onCreate, onClose }))
    const input = () => renderer.root.findByType('TextInput')
    expect(button('保存目标').props.disabled).toBe(true)
    await act(async () => {
      input().props.onChangeText('  Ship the fix  ')
    })
    const save = button('保存目标').props.onPress
    const cancel = button('取消编辑').props.onPress
    const dismiss = renderer.root.findByType('Panel').props.onClose
    await act(async () => {
      save()
      save()
      cancel()
      dismiss()
    })
    expect(onCreate).toHaveBeenCalledExactlyOnceWith('Ship the fix')
    expect(onClose).not.toHaveBeenCalled()
    expect(button('保存目标').props.disabled).toBe(true)
    expect(button('取消编辑').props.disabled).toBe(true)
    expect(input().props.editable).toBe(false)
    await act(async () => {
      first.reject(new Error('offline'))
    })
    expect(input().props.value).toBe('  Ship the fix  ')
    expect(button('保存目标').props.disabled).toBe(false)
    await act(async () => {
      button('保存目标').props.onPress()
    })
    expect(onCreate).toHaveBeenCalledTimes(2)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
  it('blocks parent-pending submissions and resets the draft only on a new opening', async () => {
    const onCreate = vi.fn()
    const onClose = vi.fn()
    const props = { open: true, pending: false, onCreate, onClose }
    await mount(createElement(NativeGoalEditor, props))
    await act(async () => {
      renderer.root.findByType('TextInput').props.onChangeText('draft')
    })
    await act(async () => {
      renderer.update(createElement(NativeGoalEditor, { ...props, pending: true }))
    })
    await act(async () => {
      button('保存目标').props.onPress()
      button('取消编辑').props.onPress()
    })
    expect(onCreate).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(renderer.root.findByType('TextInput').props.value).toBe('draft')
    await act(async () => {
      renderer.update(createElement(NativeGoalEditor, { ...props, open: false }))
    })
    await act(async () => {
      renderer.update(createElement(NativeGoalEditor, props))
    })
    expect(renderer.root.findByType('TextInput').props.value).toBe('')
  })
})

describe('blocked Goal presentation', () => {
  it('renders a truncated visible reason and opens its full text on tap', async () => {
    const reason = 'Awaiting a desktop approval before continuing the workspace review.'
    await mount(
      createElement(NativeGoalBar, {
        goal: { id: 'goal', revision: 1, objective: 'Review', phase: 'blocked', blockedReason: { message: reason } },
        pending: false,
        onMutate: vi.fn(),
      }),
    )
    const visible = renderer.root.findAllByType('Text').find((node) => node.props.children === reason)
    expect(visible?.props.numberOfLines).toBe(1)
    const summary = renderer.root
      .findAllByType('Pressable')
      .find((node) => node.props.accessibilityLabel?.includes(reason))!
    await act(async () => {
      summary.props.onPress()
    })
    expect(mocks.alert).toHaveBeenCalledWith('受阻的目标', reason)
  })
})

describe('Goal mutation cache callback', () => {
  it.each([null, 1, 'bad', { phase: 'invalid' }, { id: 'goal', revision: 2 }])(
    'does not throw or corrupt a cached Goal for a non-view response: %j',
    async (result) => {
      const original = { goal: { id: 'goal', revision: 1, objective: 'Review', phase: 'active' } }
      cache.setQueryData(queryKeys.sessionGoal('one'), original)
      const client = { mutateGoal: vi.fn().mockResolvedValue(result) } as unknown as MobileApi
      let actions!: ReturnType<typeof useSessionActions>
      function Harness() {
        actions = useSessionActions(client, 'one', () => undefined)
        return null
      }
      await mount(createElement(QueryClientProvider, { client: cache }, createElement(Harness)))
      await act(async () => {
        await actions.goalMutation.mutateAsync({ action: 'pause', ref: { id: 'goal', revision: 1 } })
      })
      expect(cache.getQueryData(queryKeys.sessionGoal('one'))).toEqual(original)
    },
  )
})
