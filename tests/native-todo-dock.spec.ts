import { createElement } from 'react'
import { act, render, cleanup, fireEvent, type RenderResult } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ appearance: 'light' as 'light' | 'dark', reduced: false }))
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
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
vi.mock('@/components/native-running-ring', () => ({ NativeRunningRing: 'RunningRing' }))
import { NativeTodoDock } from '@/components/native-todo-dock'

const nodesOf = (renderer: RenderResult, type: string) => renderer.container.queryAll((node) => node.type === type)
const texts = (renderer: RenderResult) =>
  nodesOf(renderer, 'Text').map((node) => [].concat(node.props.children).join(''))
const header = (renderer: RenderResult) =>
  renderer.container.queryAll((node) => node.props.accessibilityRole === 'button')[0]!

afterEach(cleanup)

describe('native todo dock', () => {
  it('prints nothing when the projection holds no task', async () => {
    const empty = await render(createElement(NativeTodoDock, { todos: undefined }))
    expect(empty.container.queryAll(() => true)).toHaveLength(0)
    await cleanup()
    const blank = await render(createElement(NativeTodoDock, { todos: [] }))
    expect(blank.container.queryAll(() => true)).toHaveLength(0)
  })

  it('collapses to one header row carrying the title and the readings', async () => {
    const renderer = await render(
      createElement(NativeTodoDock, {
        todos: [
          { content: 'Read the diff', status: 'completed' },
          { content: 'Patch the dock', status: 'in_progress' },
          { content: 'Run the gates', status: 'pending' },
        ],
      }),
    )
    expect(texts(renderer)).toContain('任务')
    expect(texts(renderer)).toContain('1 已完成\u2002·\u20021 进行中\u2002·\u20021 待处理')
    // Collapsed: no task line is printed yet.
    expect(texts(renderer)).not.toContain('Read the diff')
    expect(header(renderer).props.accessibilityState).toEqual({ expanded: false })
  })

  it('prints one line per task once the header is expanded', async () => {
    const renderer = await render(
      createElement(NativeTodoDock, {
        todos: [
          { content: 'Read the diff', status: 'completed' },
          { content: 'Patch the dock', status: 'in_progress' },
          { content: 'Run the gates', status: 'pending' },
        ],
      }),
    )
    await act(() => fireEvent.press(header(renderer)))
    expect(header(renderer).props.accessibilityState).toEqual({ expanded: true })
    expect(texts(renderer)).toEqual(expect.arrayContaining(['Read the diff', 'Patch the dock', 'Run the gates']))
    // The ongoing task draws the desktop StateDot ring; the others get a solid dot.
    expect(nodesOf(renderer, 'RunningRing')).toHaveLength(1)
    const markers = renderer.container.queryAll((node) => node.props.accessibilityRole === 'image')
    expect(markers.map((node) => node.props.accessibilityLabel)).toEqual(['已完成', '进行中', '待处理'])
  })

  it('collapses again on a second press', async () => {
    const renderer = await render(createElement(NativeTodoDock, { todos: [{ content: 'Only', status: 'pending' }] }))
    await act(() => fireEvent.press(header(renderer)))
    expect(texts(renderer)).toContain('Only')
    await act(() => fireEvent.press(header(renderer)))
    expect(texts(renderer)).not.toContain('Only')
  })
})
