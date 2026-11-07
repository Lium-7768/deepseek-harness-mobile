import { createElement, type ReactElement } from 'react'
import { act, render, cleanup, fireEvent, type RenderResult } from './support/native-testing'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileApi, MobileApiError } from '@/api/mobile-api'
import type { MobileScheduleEntry } from '@/types/mobile'

const mocks = vi.hoisted(() => ({ alert: vi.fn() }))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
    Alert: { alert: mocks.alert },
    useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }),
    FlatList: (props: {
      data: unknown[]
      ListHeaderComponent?: unknown
      ListFooterComponent?: unknown
      ListEmptyComponent?: unknown
      renderItem: (args: { item: unknown }) => unknown
    }) =>
      createElement(
        'FlatList',
        null,
        props.ListHeaderComponent as never,
        ...(props.data.length
          ? props.data.map((item, index) =>
              createElement('ListRow', { key: index }, props.renderItem({ item }) as never),
            )
          : [props.ListEmptyComponent as never]),
        props.ListFooterComponent as never,
      ),
  }
})
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
vi.mock('@/components/confirm-sheet', async () => {
  const { createElement } = await import('react')
  return {
    ConfirmSheet: (props: { open: boolean; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) =>
      props.open
        ? createElement(
            'Pressable',
            { accessibilityLabel: props.confirmLabel, onPress: props.onConfirm },
            createElement('Text', null, props.confirmLabel),
          )
        : null,
  }
})
vi.mock('@/components/session-screen-state', () => ({ ErrorNotice: 'ErrorNotice' }))
vi.mock('@/components/native-menu-panel', async () => {
  const { createElement } = await import('react')
  type Option = { label: string; value: string }
  return {
    NativeMenuPanel: (props: { open: boolean; groups: { options: Option[] }[]; onSelect?: (value: string) => void }) =>
      props.open
        ? createElement(
            'Menu',
            null,
            props.groups
              .flatMap((group) => group.options)
              .map((option) =>
                createElement(
                  'MenuRow',
                  {
                    accessibilityLabel: option.label,
                    key: option.value,
                    onPress: () => props.onSelect?.(option.value),
                  },
                  createElement('Text', null, option.label),
                ),
              ),
          )
        : null,
  }
})
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

let renderer: RenderResult
let cache: QueryClient
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  mocks.alert.mockClear()
})
afterEach(async () => {
  await cleanup()
  cache.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function mount(element: ReactElement) {
  await act(async () => {
    renderer = await render(element)
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
const buttons = () => renderer.container.queryAll((node) => node.type === 'ActionButton')
/** A task row's `…` control; its label names the task it belongs to. */
const rowAction = (title: string) =>
  renderer.container.queryAll((node) => node.props.accessibilityLabel === `${title} 的操作`)[0]!
/** One row inside the open action menu. */
const menuRow = (label: string) =>
  renderer.container.queryAll((node) => node.type === 'MenuRow' && node.props.accessibilityLabel === label)[0]!
const button = (label: string) => buttons().find((node) => node.props.label === label)!

describe('automation screen interaction', () => {
  it.each(['schedule-not-found', 'schedule-conflict'] as const)(
    'refreshes the catalog after %s rather than leaving a stale action row',
    async (kind) => {
      const schedules = vi
        .spyOn(MobileApi.prototype, 'schedules')
        .mockResolvedValueOnce({ items: [task('active')] })
        .mockResolvedValue({ items: [] })
      const copy =
        kind === 'schedule-not-found' ? '该任务已被桌面端删除，请刷新任务列表。' : '任务已被修改，请刷新后重试。'
      vi.spyOn(MobileApi.prototype, 'updateSchedule').mockRejectedValue(new MobileApiError(kind, copy))
      await mount(createElement(QueryClientProvider, { client: cache }, createElement(SchedulesScreen)))
      await settle(() => rowAction('active') !== undefined)
      await act(async () => {
        rowAction('active').props.onPress()
      })
      await act(async () => {
        menuRow('暂停任务').props.onPress()
      })
      await settle(() => schedules.mock.calls.length === 2 && rowAction('active') === undefined)
      expect(mocks.alert).toHaveBeenCalledWith('任务操作失败', copy)
    },
  )
  it.each(['network', 'credentials', 'timeout', 'unsupported'] as const)(
    'shows an accurate %s failure and offers a working retry',
    async (kind) => {
      const schedules = vi
        .spyOn(MobileApi.prototype, 'schedules')
        .mockRejectedValueOnce(new MobileApiError(kind, '测试错误'))
        .mockResolvedValue({ items: [] })
      await mount(createElement(QueryClientProvider, { client: cache }, createElement(SchedulesScreen)))
      await settle(() => renderer.container.queryAll((node) => node.type === 'ErrorNotice').length === 1)
      const notice = renderer.container.queryAll((node) => node.type === 'ErrorNotice')[0]
      expect(notice.props.text).toContain(kind === 'unsupported' ? '未提供自动化任务目录' : '自动化任务加载失败')
      if (kind !== 'unsupported') expect(notice.props.text).not.toContain('请更新手机访问插件')
      await act(async () => {
        notice.props.onRetry()
      })
      await settle(() => renderer.container.queryAll((node) => node.type === 'ErrorNotice').length === 0)
      expect(schedules).toHaveBeenCalledTimes(2)
    },
  )
  it('serializes pause/resume/delete before rerender, confirms deletion, and releases the gate after failure', async () => {
    vi.spyOn(MobileApi.prototype, 'schedules').mockResolvedValue({ items: [task('active'), task('paused')] })
    const update = vi.spyOn(MobileApi.prototype, 'updateSchedule')
    const first = deferred()
    update.mockReturnValueOnce(first.promise)
    await mount(createElement(QueryClientProvider, { client: cache }, createElement(SchedulesScreen)))
    await settle(() => rowAction('active') !== undefined && rowAction('paused') !== undefined)
    await act(async () => {
      rowAction('active').props.onPress()
    })
    // The same row fires twice before the pending state re-renders, so the gate —
    // not the disabled prop — is what serializes the two calls.
    const pause = menuRow('暂停任务')
    await act(async () => {
      pause.props.onPress()
      pause.props.onPress()
    })
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenLastCalledWith(task('active'), 'pause')
    await settle(() => rowAction('paused').props.disabled === true)
    await act(async () => {
      first.reject(new Error('failed'))
    })
    await settle(() => rowAction('paused').props.disabled === false)
    expect(mocks.alert).toHaveBeenCalledWith('任务操作失败', 'failed')
    const second = deferred()
    update.mockReturnValueOnce(second.promise)
    await act(async () => {
      rowAction('paused').props.onPress()
    })
    await act(async () => {
      menuRow('恢复任务').props.onPress()
    })
    expect(update).toHaveBeenLastCalledWith(task('paused'), 'resume')
    await act(async () => {
      second.resolve()
    })
    await settle(() => rowAction('active').props.disabled === false)
    mocks.alert.mockClear()
    await act(async () => {
      rowAction('active').props.onPress()
    })
    await act(async () => {
      menuRow('删除任务').props.onPress()
    })
    expect(update).toHaveBeenCalledTimes(2)
    // The delete confirmation is the sheet, not an Alert: the menu row opens it and
    // only its confirm button reaches the API (twice, to prove the gate serializes).
    const confirmButton = () =>
      renderer.container.queryAll(
        (node: { props: Record<string, unknown> }) => node.props.accessibilityLabel === '删除任务',
      )[0]!
    expect(confirmButton()).toBeTruthy()
    const third = deferred()
    update.mockReturnValueOnce(third.promise)
    await act(async () => {
      confirmButton().props.onPress()
      confirmButton().props.onPress()
    })
    expect(update).toHaveBeenCalledTimes(3)
    expect(update).toHaveBeenLastCalledWith(task('active'), 'delete')
    await act(async () => {
      third.resolve()
    })
    await settle(() => rowAction('active').props.disabled === false)
  })
})

describe('Goal editor interaction', () => {
  it('retains the draft on failure, blocks duplicate saves and all dismiss paths, then closes after retry', async () => {
    const first = deferred()
    const onCreate = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(undefined)
    const onClose = vi.fn()
    await mount(createElement(NativeGoalEditor, { open: true, pending: false, onCreate, onClose }))
    const input = () => renderer.container.queryAll((node) => node.type === 'TextInput')[0]
    expect(button('保存目标').props.disabled).toBe(true)
    await act(async () => {
      input().props.onChangeText('  Ship the fix  ')
    })
    const save = button('保存目标').props.onPress
    const cancel = button('取消编辑').props.onPress
    const dismiss = renderer.container.queryAll((node) => node.type === 'Panel')[0].props.onClose
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
      renderer.container.queryAll((node) => node.type === 'TextInput')[0].props.onChangeText('draft')
    })
    await act(async () => {
      await renderer.rerender(createElement(NativeGoalEditor, { ...props, pending: true }))
    })
    await act(async () => {
      button('保存目标').props.onPress()
      button('取消编辑').props.onPress()
    })
    expect(onCreate).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(renderer.container.queryAll((node) => node.type === 'TextInput')[0].props.value).toBe('draft')
    await act(async () => {
      await renderer.rerender(createElement(NativeGoalEditor, { ...props, open: false }))
    })
    await act(async () => {
      await renderer.rerender(createElement(NativeGoalEditor, props))
    })
    expect(renderer.container.queryAll((node) => node.type === 'TextInput')[0].props.value).toBe('')
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
    const visible = renderer.container
      .queryAll((node) => node.type === 'Text')
      .find((node) => node.props.children === reason)
    expect(visible?.props.numberOfLines).toBe(1)
    const summary = renderer.container
      .queryAll((node) => node.type === 'Pressable')
      .find((node) => node.props.accessibilityLabel?.includes(reason))!
    await act(async () => {
      summary.props.onPress()
    })
    expect(mocks.alert).toHaveBeenCalledWith('受阻的目标', reason)
  })
})

describe('Goal edit requests', () => {
  it('opens the shared editor prefilled with the latest objective and saves it back', async () => {
    const onMutate = vi.fn().mockResolvedValue(undefined)
    const original = { id: 'goal', revision: 1, objective: 'Original desktop objective', phase: 'paused' as const }
    const props = { goal: original, pending: false, onMutate, editRequest: 0 }
    await mount(createElement(NativeGoalBar, props))
    const changed = { ...original, revision: 2, objective: 'Updated on desktop' }
    await renderer.rerender(createElement(NativeGoalBar, { ...props, goal: changed }))
    // Editing opens the same sheet that creates a goal, prefilled with the current
    // objective: the bar no longer turns into an inline text field.
    await renderer.rerender(createElement(NativeGoalBar, { ...props, goal: changed, editRequest: 1 }))
    const input = () => renderer.container.queryAll((node) => node.type === 'TextInput')[0]!
    expect(input().props.value).toBe(changed.objective)
    await act(async () => {
      input().props.onChangeText('My unsaved draft')
    })
    await act(async () => {
      button('保存目标').props.onPress()
    })
    expect(onMutate).toHaveBeenCalledExactlyOnceWith('edit', { id: 'goal', revision: 2 }, 'My unsaved draft')
  })

  it('asks before clearing a goal that cannot be recovered', async () => {
    const onMutate = vi.fn().mockResolvedValue(undefined)
    const goal = { id: 'goal', revision: 1, objective: 'Review the dock', phase: 'active' as const }
    await mount(createElement(NativeGoalBar, { goal, pending: false, onMutate }))
    await act(async () => {
      renderer.container.queryAll((node) => node.props.accessibilityLabel === '目标操作')[0]!.props.onPress()
    })
    await act(async () => {
      menuRow('清除目标').props.onPress()
    })
    expect(onMutate).not.toHaveBeenCalled()
    const confirm = () =>
      renderer.container.queryAll(
        (node: { props: Record<string, unknown> }) => node.props.accessibilityLabel === '清除目标',
      )[0]!
    await act(async () => {
      confirm().props.onPress()
    })
    expect(onMutate).toHaveBeenCalledWith('clear', { id: 'goal', revision: 1 }, undefined)
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
