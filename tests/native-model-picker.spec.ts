import { createElement, type ReactElement } from 'react'
import { act, render, cleanup, type RenderResult } from './support/native-testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MobileModelProviderGroup } from '@/types/mobile'

const mocks = vi.hoisted(() => ({ appearance: 'light' as 'light' | 'dark', dismiss: vi.fn() }))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    ActivityIndicator: 'ActivityIndicator',
    Keyboard: { dismiss: mocks.dismiss },
    StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
    FlatList: (props: {
      data: unknown[]
      ListHeaderComponent: ReactElement
      ListEmptyComponent: ReactElement
      renderItem: (input: { item: unknown }) => ReactElement
    }) =>
      createElement(
        'List',
        null,
        props.ListHeaderComponent,
        props.data.length
          ? props.data.map((item, index) => createElement('Row', { key: index }, props.renderItem({ item })))
          : props.ListEmptyComponent,
      ),
  }
})
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes[mocks.appearance],
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes[mocks.appearance]),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
vi.mock('@/components/native-anchored-panel', async () => {
  const { createElement } = await import('react')
  return { NativeAnchoredPanel: (props: unknown) => createElement('Panel', props) }
})
import { NativeModelPicker } from '@/components/native-model-picker'
import { NativeEffortSlider } from '@/components/native-effort-slider'
import { themes } from '@/theme'

const groups: MobileModelProviderGroup[] = [
  {
    id: 'one',
    name: 'DeepSeek',
    models: [
      {
        id: 'route/chat',
        name: 'route/chat',
        reasoning: {
          defaultEffort: 'medium',
          efforts: [
            { id: 'low', name: '低' },
            { id: 'medium', name: '中' },
            { id: 'high', name: '高' },
            { id: 'max', name: '极高' },
          ],
        },
      },
      { id: 'fast', name: 'Fast' },
      { id: 'third', name: 'Third' },
      { id: 'fourth', name: 'Fourth' },
    ],
  },
  {
    id: 'two',
    name: 'Other provider',
    models: [
      { id: 'route/chat', name: 'Other chat' },
      { id: 'fifth', name: 'Fifth' },
    ],
  },
]
let renderer: RenderResult
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.appearance = 'light'
  mocks.dismiss.mockClear()
})
afterEach(async () => {
  await act(() => renderer?.unmount())
  vi.unstubAllGlobals()
})
async function mount(element: ReactElement) {
  await act(async () => {
    renderer = await render(element)
  })
}
function options() {
  return {
    open: true,
    groups,
    selection: { provider: 'one', model: 'route/chat' },
    effort: 'high',
    onClose: vi.fn(),
    onSelectModel: vi.fn(),
    onSelectEffort: vi.fn(),
  }
}
const press = (label: string) =>
  renderer.container
    .queryAll((node) => node.type === 'Pressable')
    .find((node) => node.props.accessibilityLabel === label)!
const texts = () => renderer.container.queryAll((node) => node.type === 'Text').map((node) => node.props.children)
const slider = () =>
  renderer.container
    .queryAll((node) => node.type === 'View')
    .find((node) => node.props.accessibilityRole === 'adjustable')!

describe('model picker interaction', () => {
  it('opens a compact effort card; drills into one checked model row and preserves search/provider identity', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    expect(texts()).toContain('高')
    expect(texts()).toContain('chat')
    expect(renderer.container.queryAll((node) => node.type === 'List')).toHaveLength(0)
    await act(() => press('选择模型：chat').props.onPress())
    expect(renderer.container.queryAll((node) => node.type === 'List')).toHaveLength(1)
    const radios = () =>
      renderer.container
        .queryAll((node) => node.type === 'Pressable')
        .filter((node) => node.props.accessibilityRole === 'radio')
    expect(radios()).toHaveLength(6)
    expect(radios().filter((node) => node.props.accessibilityState.checked)).toHaveLength(1)
    await act(() =>
      renderer.container.queryAll((node) => node.type === 'TextInput')[0].props.onChangeText('Other provider'),
    )
    expect(radios()).toHaveLength(2)
    await act(() => radios()[0].props.onPress())
    expect(props.onSelectModel).toHaveBeenCalledExactlyOnceWith({ provider: 'two', model: 'route/chat' })
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
  it('returns from the list without selecting and restores only the published default', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await act(() => press('恢复模型默认推理等级').props.onPress())
    expect(props.onSelectEffort).toHaveBeenCalledExactlyOnceWith('medium')
    await act(() => press('选择模型：chat').props.onPress())
    await act(() => renderer.container.queryAll((node) => node.type === 'TextInput')[0].props.onChangeText('missing'))
    expect(texts()).toContain('没有匹配的模型')
    await act(() => press('返回推理等级').props.onPress())
    expect(renderer.container.queryAll((node) => node.type === 'List')).toHaveLength(0)
    expect(props.onSelectModel).not.toHaveBeenCalled()
    expect(mocks.dismiss).toHaveBeenCalled()
    await act(() => press('选择模型：chat').props.onPress())
    expect(renderer.container.queryAll((node) => node.type === 'TextInput')[0].props.value).toBe('')
  })
  it('selecting the current route closes without issuing a command or resetting effort', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await act(() => press('选择模型：chat').props.onPress())
    const current = renderer.container
      .queryAll((node) => node.type === 'Pressable')
      .find((node) => node.props.accessibilityState?.checked)!
    await act(() => current.props.onPress())
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(props.onSelectModel).not.toHaveBeenCalled()
    expect(props.onSelectEffort).not.toHaveBeenCalled()
  })
  it('opens the directory directly for models without effort and keeps catalog diagnostics visible', async () => {
    await mount(
      createElement(NativeModelPicker, {
        ...options(),
        selection: { provider: 'one', model: 'fast' },
        failed: true,
        routable: false,
        failures: [{ id: 'broken', name: 'Unavailable', message: 'failed' }],
      }),
    )
    expect(renderer.container.queryAll((node) => node.type === 'List')).toHaveLength(1)
    expect(texts()).toContain('模型目录加载失败，请关闭后重试。')
    expect(texts()).toContain('当前会话没有可用的模型路由。')
    expect(texts()).toContain('供应商 Unavailable 暂时不可用。')
    expect(renderer.container.queryAll((node) => node.props.accessibilityRole === 'adjustable')).toHaveLength(0)
  })
  it.each(['light', 'dark'] as const)(
    'uses the desktop %s palette and blocks changes while pending',
    async (appearance) => {
      mocks.appearance = appearance
      const props = { ...options(), disabled: true }
      await mount(createElement(NativeModelPicker, props))
      const title = renderer.container
        .queryAll((node) => node.type === 'Text')
        .find((node) => node.props.children === '高')!
      expect(title.props.style.color).toBe(themes[appearance].colors.accentText)
      expect(slider().props.accessibilityState.disabled).toBe(true)
      await act(() => slider().props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }))
      expect(props.onSelectEffort).not.toHaveBeenCalled()
      await act(() => press('选择模型：chat').props.onPress())
      expect(
        renderer.container
          .queryAll((node) => node.type === 'Pressable')
          .filter((node) => node.props.accessibilityRole === 'radio')
          .every((node) => node.props.disabled),
      ).toBe(true)
    },
  )
})

describe('effort slider commands', () => {
  it('previews stops while dragging, commits once on release and cancels interrupted gestures', async () => {
    const onCommit = vi.fn(),
      onPreview = vi.fn()
    const choices = groups[0].models[0].reasoning!.efforts
    await mount(createElement(NativeEffortSlider, { choices, value: 'low', disabled: false, onCommit, onPreview }))
    const event = (locationX: number) => ({ nativeEvent: { locationX } })
    await act(() => slider().props.onLayout({ nativeEvent: { layout: { width: 340 } } }))
    await act(() => slider().props.onResponderGrant(event(20)))
    await act(() => slider().props.onResponderMove(event(220)))
    expect(onPreview).toHaveBeenLastCalledWith('high')
    expect(onCommit).not.toHaveBeenCalled()
    await act(() => slider().props.onResponderRelease(event(320)))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('max')
    await act(() => slider().props.onResponderRelease(event(320)))
    expect(onCommit).toHaveBeenCalledTimes(1)
    await act(() => slider().props.onResponderGrant(event(120)))
    await act(() => slider().props.onResponderTerminate())
    expect(slider().props.accessibilityValue.text).toBe('低')
    expect(onPreview).toHaveBeenLastCalledWith(undefined)
    expect(onCommit).toHaveBeenCalledTimes(1)
  })
  it('supports accessible one-step adjustments and never commits the selected boundary', async () => {
    const onCommit = vi.fn()
    await mount(
      createElement(NativeEffortSlider, {
        choices: groups[0].models[0].reasoning!.efforts,
        value: 'low',
        disabled: false,
        onCommit,
        onPreview: vi.fn(),
      }),
    )
    await act(() => slider().props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }))
    expect(onCommit).not.toHaveBeenCalled()
    await act(() => slider().props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }))
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('medium')
  })
})
