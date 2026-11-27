import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, type RenderResult } from './support/native-testing'

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View',
}))
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'NativeIcon' }))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})

import { ConversationDisclosureContext, useConversationDisclosuresState } from '@/components/conversation-disclosure'
import { NativeTurnGroup } from '@/components/native-turn-group'
import type { NativeTurnRow } from '@/components/session-turn-logic'

const allText = (renderer: RenderResult): string =>
  renderer.container
    .queryAll((node) => node.type === 'Text')
    .map((node) =>
      Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children ?? ''),
    )
    .join(' ')

const head: NativeTurnRow = {
  controlKey: 'turn:1',
  descendantKeys: ['process:1', 'process:2'],
  failed: false,
  kind: 'turn',
  locked: false,
  rowKey: 'turn:1',
  title: '已完成，用时 5秒',
  rows: [{ kind: 'retry', delayMs: 1_000, failureMessage: 'err', maxRetries: 3, retry: 1, sourceSeq: 2 }],
}

const continuation: NativeTurnRow = {
  controlKey: 'turn:1',
  continuation: true,
  failed: false,
  kind: 'turn',
  locked: false,
  rowKey: 'turn:1:part:1',
  title: '已完成，用时 5秒',
  rows: [{ kind: 'command', name: 'build', sourceSeq: 5, state: 'success' }],
}

const renderRow = (row: NativeTurnRow['rows'][number]) => createElement('Text', null, row.kind)

function Harness({ defaultOpen }: { defaultOpen?: boolean }) {
  const disclosures = useConversationDisclosuresState('sess-1')
  const headRow = defaultOpen ? { ...head, defaultOpen: true } : head
  const contRow = defaultOpen ? { ...continuation, defaultOpen: true } : continuation
  return createElement(
    ConversationDisclosureContext.Provider,
    { value: disclosures },
    createElement(NativeTurnGroup, { item: headRow, renderRow }),
    createElement(NativeTurnGroup, { gap: 12, item: contRow, renderRow }),
  )
}

afterEach(cleanup)

describe('NativeTurnGroup', () => {
  it('toggles headed and continuation segments together', async () => {
    const view = await render(createElement(Harness, { defaultOpen: false }))
    expect(allText(view)).toContain('已完成，用时 5秒')
    expect(allText(view)).not.toContain('retry')
    expect(allText(view)).not.toContain('command')

    const button = view.container.queryAll((node) => node.type === 'Pressable')[0]
    await act(async () => {
      ;(button?.props.onPress as () => void)()
    })
    expect(allText(view)).toContain('retry')
    expect(allText(view)).toContain('command')

    await act(async () => {
      ;(button?.props.onPress as () => void)()
    })
    expect(allText(view)).not.toContain('retry')
    expect(allText(view)).not.toContain('command')
  })

  it('starts open when defaultOpen is true and folds when defaultOpen flips to false', async () => {
    const deferred = await render(createElement(Harness, { defaultOpen: true }))
    expect(allText(deferred)).toContain('retry')
    expect(allText(deferred)).toContain('command')
    await deferred.rerender(createElement(Harness, { defaultOpen: false }))
    expect(allText(deferred)).not.toContain('retry')
    expect(allText(deferred)).not.toContain('command')
  })
})
