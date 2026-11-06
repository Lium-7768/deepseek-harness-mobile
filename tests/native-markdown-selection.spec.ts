import { createElement } from 'react'
import { act, render, cleanup, type RenderResult } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Every block a reader can see must be long-press selectable, except the list
 * marker, which only carries "1." or "-".
 */
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Linking: { openURL: vi.fn() },
  Platform: { OS: 'ios' },
  AccessibilityInfo: { announceForAccessibility: vi.fn() },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
vi.mock('expo-clipboard', () => ({ setStringAsync: vi.fn(async () => undefined) }))

import { NativeMarkdown } from '@/components/native-markdown'

const texts = (renderer: RenderResult) => renderer.container.queryAll((node) => node.type === 'Text')
const selectableTexts = (renderer: RenderResult) => texts(renderer).filter((node) => node.props.selectable === true)
const textOf = (node: { props: { children: unknown } }): string =>
  []
    .concat(node.props.children as never)
    .map(flattenText)
    .join('')
const flattenText = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(flattenText).join('')
  if (value !== null && typeof value === 'object' && 'props' in (value as object))
    return textOf(value as { props: { children: unknown } })
  return value === null || value === undefined ? '' : String(value)
}

afterEach(cleanup)

describe('native markdown selection', () => {
  it('lets a heading be selected', async () => {
    const renderer = await render(createElement(NativeMarkdown, { markdown: '## Install the client' }))
    const selected = selectableTexts(renderer)
    expect(selected.length).toBeGreaterThan(0)
    expect(selected.map(textOf).join('')).toContain('Install the client')
    await act(async () => undefined)
  })

  it('lets a quote be selected', async () => {
    const renderer = await render(createElement(NativeMarkdown, { markdown: '> measured at 22px' }))
    expect(selectableTexts(renderer).map(textOf).join('')).toContain('measured at 22px')
    await act(async () => undefined)
  })

  it('lets list item text be selected without making the marker selectable', async () => {
    const renderer = await render(createElement(NativeMarkdown, { markdown: '- first reading\n- second reading' }))
    const selected = selectableTexts(renderer).map(textOf).join('')
    expect(selected).toContain('first reading')
    expect(selected).toContain('second reading')
    // The bullet itself stays out of the selection so a copy is not prefixed with "-".
    expect(selected).not.toContain('- ')
    await act(async () => undefined)
  })

  it('lets table cells be selected', async () => {
    const renderer = await render(
      createElement(NativeMarkdown, { markdown: '| Key | Value |\n| --- | --- |\n| dock | 22 |' }),
    )
    const selected = selectableTexts(renderer).map(textOf).join(' ')
    expect(selected).toContain('dock')
    expect(selected).toContain('22')
    await act(async () => undefined)
  })

  it('keeps a plain paragraph selectable', async () => {
    const renderer = await render(createElement(NativeMarkdown, { markdown: 'The dock keeps its reserved row.' }))
    expect(selectableTexts(renderer).map(textOf).join('')).toContain('reserved row')
    await act(async () => undefined)
  })
})

describe('tool and status content selection', () => {
  it('keeps the collapsed flow header a control rather than a selection target', async () => {
    // The one-line header toggles the disclosure; wrapping it in a Text selection would
    // take the tap. The full payload below it is selectable instead.
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../src/components/native-flow-row.tsx', import.meta.url), 'utf8')
    expect(source).not.toContain('selectable')
  })

  it('marks diff paths and diff lines selectable', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../src/components/native-diff-block.tsx', import.meta.url), 'utf8')
    // Path plus one selectable line renderer; the stat and truncation notes are labels.
    expect((source.match(/selectable/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('marks the failure message, retry delay, command and compaction rows selectable', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../src/components/native-conversation-status.tsx', import.meta.url), 'utf8')
    expect((source.match(/selectable/g) ?? []).length).toBeGreaterThanOrEqual(9)
  })
})
