import { createElement } from 'react'
import { render, cleanup, type RenderResult } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ appearance: 'light' as 'light' | 'dark' }))
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
vi.mock('@/components/native-anchored-panel', async () => {
  const { createElement } = await import('react')
  return { NativeAnchoredPanel: (props: { open: boolean }) => (props.open ? createElement('Panel', props) : null) }
})
vi.mock('react-native-svg', () => ({ default: 'Svg', SvgXml: 'SvgXml' }))
import { NativeStatisticsPill } from '@/components/native-statistics-pill'
import { NativeContextMeter } from '@/components/native-context-meter'
import { SessionDock } from '@/components/session-screen-state'
import { themes } from '@/theme'

const pill = { glyph: 'stats-outline' as const, kind: 'tokens' as const, label: '18.4k tokens' }

const nodesOf = (renderer: RenderResult, type: string) => renderer.container.queryAll((node) => node.type === type)
const pressable = (renderer: RenderResult, label: string) =>
  renderer.container.queryAll((node) => node.props.accessibilityLabel === label)[0]!
/** RN accepts a style callback for pressable state; the tests need the resolved object. */
const resolvedStyle = (node: { props: Record<string, unknown> }): Record<string, unknown> => {
  const style = node.props.style
  const flattened =
    typeof style === 'function' ? (style as (state: { pressed: boolean }) => unknown)({ pressed: false }) : style
  return Object.assign({}, ...(Array.isArray(flattened) ? flattened : [flattened])) as Record<string, unknown>
}

afterEach(cleanup)

describe('composer dock metrics', () => {
  it('draws the statistics chip at the desktop 22 with the touch target on hitSlop', async () => {
    const renderer = await render(createElement(NativeStatisticsPill, { headline: '18.4k', panel: undefined, pill }))
    const chip = pressable(renderer, '18.4k tokens')
    expect(resolvedStyle(chip)).toMatchObject({ paddingVertical: 1 })
    expect(resolvedStyle(chip)).not.toHaveProperty('minHeight')
    expect(chip.props.hitSlop).toEqual({ top: 11, bottom: 11 })
  })

  it('draws the context meter chip at the same 22 on an r8 corner', async () => {
    const renderer = await render(
      createElement(NativeContextMeter, {
        panel: { figures: '~18.4k / 128k', percent: 14, rows: [], title: 'Context' },
      }),
    )
    const chip = renderer.container.queryAll(
      (node) => node.props.accessibilityRole === 'button' && node.props.hitSlop !== undefined,
    )[0]!
    expect(resolvedStyle(chip)).toMatchObject({ borderRadius: themes.light.radius.sm, paddingVertical: 1 })
    expect(resolvedStyle(chip)).not.toHaveProperty('minHeight')
    expect(chip.props.hitSlop).toEqual({ top: 11, bottom: 11 })
  })

  it('keeps the dock row so the composer never resizes when readings arrive', async () => {
    const empty = await render(createElement(SessionDock, { items: [], projectionValues: undefined }))
    expect(nodesOf(empty, 'View')).toHaveLength(1)
    expect(nodesOf(empty, 'View')[0]!.props.style).toMatchObject({ minHeight: 22 })
    await cleanup()
    const filled = await render(
      createElement(SessionDock, {
        items: [],
        projectionValues: { context: { figures: '~1k / 128k', percent: 1, rows: [] } },
      }),
    )
    expect(nodesOf(filled, 'View')[0]!.props.style).toMatchObject({ minHeight: 22 })
  })
})
