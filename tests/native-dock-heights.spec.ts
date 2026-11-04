import { createElement } from 'react'
import { act, render, cleanup, fireEvent, type RenderResult } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  useWindowDimensions: () => ({ fontScale: 1, height: 852, width: 393 }),
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
import { NativeGoalBar } from '@/components/native-goal-bar'
import { NativeQueueDock } from '@/components/native-queue-dock'
import { themes } from '@/theme'

const goal = { id: 'goal', objective: 'Review the dock', phase: 'active' as const }

const resolvedStyle = (node: { props: Record<string, unknown> }): Record<string, unknown> => {
  const style = node.props.style
  const flattened =
    typeof style === 'function' ? (style as (state: { pressed: boolean }) => unknown)({ pressed: false }) : style
  return Object.assign({}, ...(Array.isArray(flattened) ? flattened : [flattened])) as Record<string, unknown>
}
const byLabel = (renderer: RenderResult, label: string) =>
  renderer.container.queryAll((node) => node.props.accessibilityLabel === label)[0]!

afterEach(cleanup)

describe('goal bar and queue dock heights', () => {
  it('keeps the goal bar at the desktop 36 and moves the touch target to hitSlop', async () => {
    const renderer = await render(createElement(NativeGoalBar, { goal, pending: false, onMutate: vi.fn() } as never))
    const bar = renderer.container.queryAll((node) => {
      const style = resolvedStyle(node) as { borderRadius?: number; minHeight?: number }
      return style.minHeight === 36 && style.borderRadius === themes.light.radius.md
    })[0]!
    expect(resolvedStyle(bar)).toMatchObject({
      gap: 10,
      minHeight: 36,
      paddingLeft: 12,
      paddingRight: 5,
      paddingVertical: 4,
    })
    const action = renderer.container.queryAll((node) => node.props.accessibilityRole === 'button')[0]!
    expect(resolvedStyle(action)).toMatchObject({ minHeight: 28, minWidth: 28 })
    expect(action.props.hitSlop).toBe(8)
  })

  it('keeps the queue dock header and rows at the desktop 36 too', async () => {
    const renderer = await render(
      createElement(NativeQueueDock, {
        // Two items so the collapsing summary header renders as well.
        items: [
          { id: 'q1', message: { content: [{ text: 'First queued prompt', type: 'text' }] }, placement: 'queued' },
          { id: 'q2', message: { content: [{ text: 'Second queued prompt', type: 'text' }] }, placement: 'queued' },
        ],
        onUpdate: vi.fn(),
        running: false,
      } as never),
    )
    // The summary button carries the expand verb; the row's actions follow it.
    const header = renderer.container.queryAll(
      (node) =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.includes('条待发送消息，展开列表'),
    )[0]!
    expect(resolvedStyle(header)).toMatchObject({ gap: 10, minHeight: 36 })
    expect(header.props.hitSlop).toEqual({ top: 4, bottom: 4 })
    const rows = renderer.container.queryAll((node) => {
      const style = resolvedStyle(node) as { minHeight?: number }
      return style.minHeight === 36
    })
    expect(rows.length).toBeGreaterThan(0)
  })
})
