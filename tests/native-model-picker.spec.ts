import { createElement, type ReactElement } from 'react'
import { act, render, cleanup, type RenderResult } from './support/native-testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MobileModelProviderGroup } from '@/types/mobile'

const mocks = vi.hoisted(() => ({ appearance: 'light' as 'light' | 'dark' }))
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
})
afterEach(async () => {
  await cleanup()
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

describe('model picker card', () => {
  it('always renders the effort card, with no directory, search or second pane', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    expect(texts()).toContain('高')
    expect(texts()).toContain('chat')
    expect(texts()).toContain('DeepSeek')
    expect(texts()).toContain('1 / 6')
    expect(slider()).toBeDefined()
    expect(renderer.container.queryAll((node) => ['List', 'FlatList', 'TextInput'].includes(node.type))).toHaveLength(0)
    await act(() => press('下一个模型').props.onPress())
    expect(props.onSelectModel).toHaveBeenCalledExactlyOnceWith({ provider: 'one', model: 'fast' })
    expect(props.onClose).not.toHaveBeenCalled()
  })
  it('keeps the card and disabled slider for models without reasoning; model changes remain available', async () => {
    const props = { ...options(), selection: { provider: 'one', model: 'fast' }, effort: undefined }
    await mount(createElement(NativeModelPicker, props))
    expect(texts()).toContain('此模型不支持推理等级')
    expect(slider().props.accessibilityState.disabled).toBe(true)
    await act(() => slider().props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }))
    expect(props.onSelectEffort).not.toHaveBeenCalled()
    await act(() => press('上一个模型').props.onPress())
    expect(props.onSelectModel).toHaveBeenCalledExactlyOnceWith({ provider: 'one', model: 'route/chat' })
    expect(props.onClose).not.toHaveBeenCalled()
    expect(renderer.container.queryAll((node) => node.type === 'List')).toHaveLength(0)
  })
  it('switches using provider plus model identity and respects catalog boundaries', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    expect(press('上一个模型').props.disabled).toBe(true)
    await act(() => press('上一个模型').props.onPress())
    expect(props.onSelectModel).not.toHaveBeenCalled()
    await renderer.rerender(
      createElement(NativeModelPicker, { ...props, selection: { provider: 'one', model: 'fourth' } }),
    )
    await act(() => press('下一个模型').props.onPress())
    expect(props.onSelectModel).toHaveBeenCalledExactlyOnceWith({ provider: 'two', model: 'route/chat' })
    await renderer.rerender(
      createElement(NativeModelPicker, { ...props, selection: { provider: 'two', model: 'fifth' } }),
    )
    expect(press('下一个模型').props.disabled).toBe(true)
    await act(() => press('下一个模型').props.onPress())
    expect(props.onSelectModel).toHaveBeenCalledTimes(1)
  })
  it('restores only a published default without closing the card', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await act(() => press('恢复模型默认推理等级').props.onPress())
    expect(props.onSelectEffort).toHaveBeenCalledExactlyOnceWith('medium')
    expect(props.onClose).not.toHaveBeenCalled()
  })
  it('keeps diagnostics and the slider card when the catalog fails or the current route is missing', async () => {
    const props = {
      ...options(),
      groups: [],
      failed: true,
      routable: false,
      failures: [{ id: 'broken', name: 'Unavailable', message: 'failed' }],
    }
    await mount(createElement(NativeModelPicker, props))
    expect(texts()).toContain('模型目录加载失败，请关闭后重试。')
    expect(texts()).toContain('当前会话没有可用的模型路由。')
    expect(texts()).toContain('供应商 Unavailable 暂时不可用。')
    expect(slider().props.accessibilityState.disabled).toBe(true)
    await act(() => {
      press('上一个模型').props.onPress()
      press('下一个模型').props.onPress()
    })
    expect(props.onSelectModel).not.toHaveBeenCalled()
  })
  it('handles a single effort and recovers a missing route without inventing effort options', async () => {
    const props = {
      ...options(),
      groups: [
        {
          id: 'one',
          name: 'DeepSeek',
          models: [
            {
              id: 'single',
              name: 'Single',
              reasoning: { efforts: [{ id: 'only', name: '唯一' }], defaultEffort: 'only' },
            },
          ],
        },
      ],
      selection: { provider: 'one', model: 'single' },
      effort: undefined,
    }
    await mount(createElement(NativeModelPicker, props))
    expect(texts()).toContain('唯一')
    expect(slider().props.accessibilityState.disabled).toBe(true)
    await renderer.rerender(
      createElement(NativeModelPicker, { ...props, selection: { provider: 'missing', model: 'route' } }),
    )
    await act(() => press('下一个模型').props.onPress())
    expect(props.onSelectModel).toHaveBeenCalledExactlyOnceWith({ provider: 'one', model: 'single' })
  })
  it.each(['light', 'dark'] as const)(
    'uses the desktop %s palette and blocks all mutations while pending',
    async (appearance) => {
      mocks.appearance = appearance
      const props = { ...options(), disabled: true }
      await mount(createElement(NativeModelPicker, props))
      const title = renderer.container
        .queryAll((node) => node.type === 'Text')
        .find((node) => node.props.children === '高')!
      expect(title.props.style.color).toBe(themes[appearance].colors.accentText)
      expect(slider().props.accessibilityState.disabled).toBe(true)
      await act(() => {
        press('上一个模型').props.onPress()
        press('下一个模型').props.onPress()
      })
      await act(() => slider().props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }))
      expect(props.onSelectModel).not.toHaveBeenCalled()
      expect(props.onSelectEffort).not.toHaveBeenCalled()
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
