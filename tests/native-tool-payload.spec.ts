import { createElement } from 'react'
import { act, render, cleanup, fireEvent, type RenderResult } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ platform: 'ios' as string }))
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  get Platform() {
    return { OS: mocks.platform }
  },
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
vi.mock('@/components/native-diff-block', () => ({ NativeDiffBlock: 'DiffBlock' }))
vi.mock('@/components/native-anchored-panel', () => ({ NativeAnchoredPanel: 'Panel' }))
vi.mock('@/components/native-list', () => ({ NativeListRow: 'ListRow' }))
vi.mock('expo-clipboard', () => ({ setStringAsync: vi.fn(async () => undefined) }))

import { NativeToolCard } from '@/components/native-tool-card'

const texts = (renderer: RenderResult) =>
  renderer.container.queryAll((node) => node.type === 'Text').map((node) => [].concat(node.props.children).join(''))
const buttons = (renderer: RenderResult) =>
  renderer.container.queryAll((node) => node.props.accessibilityRole === 'button')

const row = (output: string) => ({
  kind: 'tool' as const,
  sourceSeq: 1,
  state: 'completed' as const,
  toolName: 'bash',
  output,
})

afterEach(cleanup)

describe('tool payload fold', () => {
  it('keeps a short output whole and offers no expand control', async () => {
    const renderer = await render(createElement(NativeToolCard, { row: row('one\ntwo') }))
    expect(texts(renderer).join(' ')).toContain('two')
    expect(buttons(renderer).some((node) => String(node.props.accessibilityLabel).includes('展开全部'))).toBe(false)
    await act(async () => undefined)
  })

  it('folds a long output and names how many lines stay hidden', async () => {
    const output = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join('\n')
    const renderer = await render(createElement(NativeToolCard, { row: row(output) }))
    expect(texts(renderer).join(' ')).toContain('还有 4 行')
    const expand = buttons(renderer).find((node) => String(node.props.accessibilityLabel).includes('展开全部'))
    expect(String(expand?.props.accessibilityLabel)).toContain('20')
    await act(async () => undefined)
  })

  it('expands on press and offers the collapse control instead', async () => {
    const output = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join('\n')
    const renderer = await render(createElement(NativeToolCard, { row: row(output) }))
    const expand = buttons(renderer).find((node) => String(node.props.accessibilityLabel).includes('展开全部'))!
    await act(async () => {
      fireEvent.press(expand)
    })
    expect(texts(renderer).join(' ')).not.toContain('还有 4 行')
    expect(buttons(renderer).some((node) => String(node.props.accessibilityLabel).includes('收起'))).toBe(true)
  })

  it('never renders a vertical payload scroller', async () => {
    const output = Array.from({ length: 40 }, (_, index) => `line ${index + 1}`).join('\n')
    const renderer = await render(createElement(NativeToolCard, { row: row(output) }))
    const scrollers = renderer.container.queryAll((node) => node.type === 'ScrollView')
    // Horizontal only: a vertical one would steal the conversation's own drag.
    expect(scrollers.every((node) => node.props.horizontal === true)).toBe(true)
    await act(async () => undefined)
  })
})
