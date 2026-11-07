import { createElement } from 'react'
import { act, cleanup, fireEvent, render } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios },
}))
vi.mock('expo-image', () => ({ Image: 'Image' }))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('@/components/native-brand-mark', () => ({ NativeBrandMark: 'BrandMark' }))
vi.mock('@/components/native-action-button', () => ({
  NativeActionButton: (props: { label: string; onPress: () => void }) =>
    createElement('Pressable', { accessibilityLabel: props.label, onPress: props.onPress }),
}))
vi.spyOn(console, 'error').mockImplementation(() => undefined)

import { AppErrorBoundary } from '@/components/app-error-boundary'

function Boom(): never {
  throw new Error('bad row')
}

afterEach(async () => {
  await cleanup()
})

describe('app error boundary', () => {
  const texts = (renderer: ReturnType<typeof render>): string[] =>
    renderer.container.queryAll((node) => node.type === 'Text').map((node) => String(node.props.children))
  const reload = (renderer: ReturnType<typeof render>) =>
    renderer.container.queryAll((node) => node.props.accessibilityLabel === '重新加载')[0]!

  it('renders the children when nothing throws', async () => {
    const renderer = await render(createElement(AppErrorBoundary, null, createElement('Text', null, 'ok')))
    expect(texts(renderer)).toContain('ok')
  })

  it('shows a recovery instead of a white screen when a child throws, and retries', async () => {
    const renderer = await render(createElement(AppErrorBoundary, null, createElement(Boom)))
    expect(texts(renderer)).toContain('页面出现问题')
    await act(async () => {
      fireEvent.press(reload(renderer))
    })
    // After a retry the same child throws again, so the fallback returns rather than
    // leaving a blank tree.
    expect(texts(renderer)).toContain('页面出现问题')
  })

  it('recovers when the child stops throwing', async () => {
    let shouldThrow = true
    const MaybeBoom = (): React.JSX.Element => {
      if (shouldThrow) throw new Error('bad row')
      return createElement('Text', null, 'recovered')
    }
    const renderer = await render(createElement(AppErrorBoundary, null, createElement(MaybeBoom)))
    expect(texts(renderer)).toContain('页面出现问题')
    shouldThrow = false
    await act(async () => {
      fireEvent.press(reload(renderer))
    })
    expect(texts(renderer)).toContain('recovered')
  })
})
