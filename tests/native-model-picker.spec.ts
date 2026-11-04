import { createElement, type ReactElement } from 'react'
import { act, render, cleanup, fireEvent, type RenderResult } from './support/native-testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MobileModelProviderGroup } from '@/types/mobile'

const mocks = vi.hoisted(() => ({ appearance: 'light' as 'light' | 'dark', fontScale: 1, dismiss: vi.fn() }))
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
    useWindowDimensions: () => ({ width: 393, height: 852, fontScale: mocks.fontScale }),
    StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
    FlatList: (props: {
      data: unknown[]
      ListHeaderComponent: ReactElement
      ListEmptyComponent: ReactElement
      renderItem: (args: { item: unknown }) => ReactElement
    }) =>
      createElement(
        'FlatList',
        null,
        props.ListHeaderComponent,
        ...(props.data.length
          ? props.data.map((item, index) => createElement('ListRow', { key: index }, props.renderItem({ item })))
          : [props.ListEmptyComponent]),
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
      {
        id: 'reasoned',
        name: 'Reasoned',
        reasoning: {
          defaultEffort: 'high',
          efforts: [
            { id: 'low', name: '低' },
            { id: 'high', name: '高' },
          ],
        },
      },
      { id: 'fifth', name: 'Fifth' },
    ],
  },
]
let renderer: RenderResult
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.appearance = 'light'
  mocks.fontScale = 1
  mocks.dismiss.mockClear()
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
const press = (label: string) => renderer.getByLabelText(label)
const texts = () => renderer.container.queryAll((node) => node.type === 'Text').map((node) => node.children.join(''))
const slider = () => renderer.getByRole('adjustable')
const route = (name: string, provider: string) => renderer.getByLabelText(`${name}，供应商 ${provider}`)

describe('slider card and model directory', () => {
  it('opens a concrete searchable grouped route list from the Codex-style effort card', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    expect(texts()).toContain('高')
    expect(texts()).toContain('chat')
    expect(slider()).toBeDefined()
    expect(renderer.queryByPlaceholderText('搜索模型')).toBeNull()
    await act(() => press('浏览可用模型：chat').props.onPress())
    expect(renderer.getByText('选择模型')).toBeDefined()
    expect(renderer.getByPlaceholderText('搜索模型')).toBeDefined()
    expect(renderer.getByText('DeepSeek')).toBeDefined()
    expect(
      renderer.container
        .queryAll((node) => node.props.accessibilityRole === 'radio')
        .filter((node) => node.props.accessibilityState.checked),
    ).toHaveLength(1)
    expect(props.onClose).not.toHaveBeenCalled()
  })
  it('searches provider/model names, disambiguates equal ids and returns to the same slider card after selection', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await act(() => press('浏览可用模型：chat').props.onPress())
    await act(() => renderer.getByPlaceholderText('搜索模型').props.onChangeText('Other provider'))
    expect(renderer.getByText('Other chat')).toBeDefined()
    expect(renderer.queryByText('Fast')).toBeNull()
    await act(() => fireEvent.press(route('Other chat', 'Other provider')))
    expect(props.onSelectModel).toHaveBeenCalledExactlyOnceWith({ provider: 'two', model: 'route/chat' })
    expect(props.onClose).not.toHaveBeenCalled()
    expect(renderer.queryByPlaceholderText('搜索模型')).toBeNull()
    expect(slider()).toBeDefined()
  })
  it('marks the selected route as a no-op and sends the host default effort for a different model', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await act(() => press('浏览可用模型：chat').props.onPress())
    await act(() =>
      fireEvent.press(
        renderer.container
          .queryAll((node) => node.props.accessibilityRole === 'radio')
          .find((node) => node.props.accessibilityState.checked)!,
      ),
    )
    expect(props.onSelectModel).not.toHaveBeenCalled()
    expect(slider()).toBeDefined()
    await act(() => press('浏览可用模型：chat').props.onPress())
    await act(() => fireEvent.press(route('Reasoned', 'Other provider')))
    expect(props.onSelectModel).toHaveBeenCalledExactlyOnceWith({
      provider: 'two',
      model: 'reasoned',
      reasoningEffort: 'high',
    })
    expect(slider()).toBeDefined()
  })
  it('backs out without submitting, clears its temporary search, and restores the slider', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await act(() => press('浏览可用模型：chat').props.onPress())
    await act(() => renderer.getByPlaceholderText('搜索模型').props.onChangeText('missing'))
    expect(renderer.getByText('没有匹配的模型')).toBeDefined()
    await act(() => fireEvent.press(press('返回推理等级卡片')))
    expect(renderer.queryByPlaceholderText('搜索模型')).toBeNull()
    expect(props.onSelectModel).not.toHaveBeenCalled()
    expect(mocks.dismiss).toHaveBeenCalled()
    expect(slider()).toBeDefined()
    await act(() => press('浏览可用模型：chat').props.onPress())
    expect(renderer.getByPlaceholderText('搜索模型').props.value).toBe('')
  })
  it('clears a search in place and hides the search field for a short catalog', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await act(() => fireEvent.press(press('浏览可用模型：chat')))
    await act(() => renderer.getByPlaceholderText('搜索模型').props.onChangeText('Reasoned'))
    expect(renderer.queryByText('Fast')).toBeNull()
    await fireEvent.press(press('清除搜索'))
    expect(renderer.getByPlaceholderText('搜索模型').props.value).toBe('')
    expect(renderer.getByText('Fast')).toBeDefined()
    await fireEvent.press(press('返回推理等级卡片'))
    await renderer.rerender(
      createElement(NativeModelPicker, { ...props, groups: [{ ...groups[0], models: groups[0].models.slice(0, 2) }] }),
    )
    await fireEvent.press(press('浏览可用模型：chat'))
    expect(renderer.queryByPlaceholderText('搜索模型')).toBeNull()
    expect(renderer.getByText('Fast')).toBeDefined()
  })
  it('dismisses the directory on close and reopens on the effort card without a retained search', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await fireEvent.press(press('浏览可用模型：chat'))
    await act(() => renderer.getByPlaceholderText('搜索模型').props.onChangeText('Fast'))
    await renderer.rerender(createElement(NativeModelPicker, { ...props, open: false }))
    await renderer.rerender(createElement(NativeModelPicker, props))
    expect(slider()).toBeDefined()
    expect(renderer.queryByPlaceholderText('搜索模型')).toBeNull()
  })
  it('preserves the search while native rows remeasure for a system font-scale change', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await fireEvent.press(press('浏览可用模型：chat'))
    await act(() => renderer.getByPlaceholderText('搜索模型').props.onChangeText('Other provider'))
    mocks.fontScale = 1.8
    await renderer.rerender(createElement(NativeModelPicker, props))
    expect(renderer.getByPlaceholderText('搜索模型').props.value).toBe('Other provider')
    expect(renderer.getByText('Other chat')).toBeDefined()
    expect(renderer.queryByText('Fast')).toBeNull()
    expect(props.onSelectModel).not.toHaveBeenCalled()
  })
  it('keeps host failures and reload visible in an empty model directory', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined)
    const props = {
      ...options(),
      groups: [],
      failed: true,
      routable: false,
      failures: [{ id: 'offline', name: 'Offline provider', message: 'offline' }],
      onRetry,
    }
    await mount(createElement(NativeModelPicker, props))
    await fireEvent.press(press('浏览可用模型：chat'))
    expect(renderer.getByText('模型目录加载失败，请重新加载。')).toBeDefined()
    expect(renderer.getByText('当前会话没有可用的模型路由。')).toBeDefined()
    expect(renderer.getByText('供应商 Offline provider 暂时不可用。')).toBeDefined()
    await fireEvent.press(press('重新加载模型'))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(props.onSelectModel).not.toHaveBeenCalled()
  })
  it('restores the host default effort without changing the model or leaving the card', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await fireEvent.press(press('恢复模型默认推理等级'))
    expect(props.onSelectEffort).toHaveBeenCalledExactlyOnceWith('medium')
    expect(props.onSelectModel).not.toHaveBeenCalled()
    expect(props.onClose).not.toHaveBeenCalled()
    expect(slider()).toBeDefined()
  })
  it('keeps the measured slider width through an external model change while on the card', async () => {
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    const original = slider()
    await act(() => original.props.onLayout({ nativeEvent: { layout: { width: 340 } } }))
    await renderer.rerender(
      createElement(NativeModelPicker, { ...props, selection: { provider: 'two', model: 'reasoned' } }),
    )
    expect(slider()).toBe(original)
    const thumb = renderer.container
      .queryAll(
        (node) =>
          node.type === 'View' &&
          Array.isArray(node.props.style) &&
          node.props.style.some((style: { left?: number }) => style?.left !== undefined),
      )
      .at(-1)!
    expect(thumb.props.style.at(-1).left).toBe(300)
  })
  it('keeps a disabled slider for models with no effort while retaining model discovery', async () => {
    const props = { ...options(), selection: { provider: 'one', model: 'fast' }, effort: undefined }
    await mount(createElement(NativeModelPicker, props))
    expect(renderer.getByText('此模型不支持推理等级')).toBeDefined()
    expect(slider().props.accessibilityState.disabled).toBe(true)
    await act(() => press('浏览可用模型：Fast').props.onPress())
    expect(renderer.getByText('选择模型')).toBeDefined()
  })
  it('places loading and retry inside the list pane and serializes retry taps', async () => {
    let reject!: (error: Error) => void
    const onRetry = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_yes, no) => {
            reject = no
          }),
      )
      .mockResolvedValueOnce(undefined)
    const props = { ...options(), failed: true, onRetry }
    await mount(createElement(NativeModelPicker, props))
    await act(() => press('浏览可用模型：chat').props.onPress())
    await act(() => {
      fireEvent.press(press('重新加载模型'))
      fireEvent.press(press('重新加载模型'))
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(press('重新加载模型').props.accessibilityState.busy).toBe(true)
    await act(() => reject(new Error('offline')))
    await act(async () => fireEvent.press(press('重新加载模型')))
    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(props.onClose).not.toHaveBeenCalled()
  })
  it('uses desktop light/dark colors and blocks selecting or adjusting while pending', async () => {
    mocks.appearance = 'dark'
    const props = options()
    await mount(createElement(NativeModelPicker, props))
    await act(() => fireEvent.press(press('浏览可用模型：chat')))
    await renderer.rerender(createElement(NativeModelPicker, { ...props, disabled: true }))
    await act(() => fireEvent.press(renderer.container.queryAll((node) => node.props.accessibilityRole === 'radio')[1]))
    expect(props.onSelectModel).not.toHaveBeenCalled()
    await act(() => fireEvent.press(press('返回推理等级卡片')))
    expect(slider().props.accessibilityState.disabled).toBe(true)
    expect((renderer.getByText('高').props.style as { color: string }).color).toBe(themes.dark.colors.accentText)
  })
  it('preserves track width and cancels stale drags when route identity changes', async () => {
    const choices = groups[0].models[0].reasoning!.efforts
    const onCommit = vi.fn(),
      onPreview = vi.fn()
    const props = {
      choices,
      value: 'low',
      disabled: false,
      onCommit,
      onPreview,
      selection: { provider: 'one', model: 'chat' },
    }
    await mount(createElement(NativeEffortSlider, props))
    const original = slider()
    await act(() => original.props.onLayout({ nativeEvent: { layout: { width: 340 } } }))
    await act(() => original.props.onResponderGrant({ nativeEvent: { locationX: 220 } }))
    await renderer.rerender(
      createElement(NativeEffortSlider, {
        ...props,
        choices: [{ id: 'max', name: '极高' }],
        value: 'max',
        selection: { provider: 'two', model: 'chat' },
      }),
    )
    expect(slider()).toBe(original)
    expect(slider().props.accessibilityValue.text).toBe('极高')
    await act(() => slider().props.onResponderRelease({ nativeEvent: { locationX: 320 } }))
    expect(onCommit).not.toHaveBeenCalled()
    expect(onPreview).toHaveBeenLastCalledWith(undefined)
  })
})

describe('effort slider commands', () => {
  it('cancels an in-flight gesture on a route change, even for same-id models on different providers', async () => {
    const choices = groups[0].models[0].reasoning!.efforts
    const onCommit = vi.fn(),
      onPreview = vi.fn()
    const props = {
      choices,
      value: 'low',
      disabled: false,
      onCommit,
      onPreview,
      selection: { provider: 'one', model: 'chat' },
    }
    await mount(createElement(NativeEffortSlider, props))
    await act(() => slider().props.onLayout({ nativeEvent: { layout: { width: 340 } } }))
    await act(() => slider().props.onResponderGrant({ nativeEvent: { locationX: 220 } }))
    expect(slider().props.accessibilityValue.text).toBe('高')
    await renderer.rerender(
      createElement(NativeEffortSlider, {
        ...props,
        choices: [{ id: 'max', name: '极高' }],
        value: 'max',
        selection: { provider: 'two', model: 'chat' },
      }),
    )
    expect(slider().props.accessibilityValue.text).toBe('极高')
    expect(slider().props.accessibilityState.disabled).toBe(true)
    await act(() => slider().props.onResponderRelease({ nativeEvent: { locationX: 320 } }))
    expect(onCommit).not.toHaveBeenCalled()
    expect(onPreview).toHaveBeenLastCalledWith(undefined)
  })
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
