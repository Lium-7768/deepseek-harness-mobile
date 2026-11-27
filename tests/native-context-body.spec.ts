import { createElement } from 'react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { act, cleanup, render, type RenderResult } from './support/native-testing'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Platform: { OS: 'ios' },
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})

import { NativeContextBody, resolveContextPresentation } from '@/components/native-context-body'

const allText = (renderer: RenderResult): string =>
  renderer.container
    .queryAll((node) => node.type === 'Text')
    .map((node) => String(node.props.children ?? ''))
    .join(' ')

afterEach(cleanup)

describe('resolveContextPresentation and NativeContextBody', () => {
  it('resolves all six desktop context forms and falls back to opaque when malformed', () => {
    expect(
      resolveContextPresentation({
        form: 'instructions',
        source: { kind: 'agent-instructions', changes: [{ action: 'set', path: 'AGENTS.md' }] },
        text: 'body',
      }),
    ).toEqual({ rendered: 'instructions', summary: null, hasBody: true })

    expect(
      resolveContextPresentation({
        form: 'catalog',
        source: { kind: 'skill-catalog', entries: [{ name: 'audit', description: 'Run audit' }] },
        text: '',
      }),
    ).toEqual({ rendered: 'catalog', summary: null, hasBody: true })

    expect(
      resolveContextPresentation({
        form: 'snapshot',
        source: { kind: 'runtime', sections: [{ name: 'cwd', text: '/tmp' }] },
        text: '',
      }),
    ).toEqual({ rendered: 'snapshot', summary: null, hasBody: true })

    expect(
      resolveContextPresentation({
        form: 'notice',
        source: { kind: 'guard', summary: 'Paused for review' },
        text: 'details',
      }),
    ).toEqual({ rendered: 'notice', summary: 'Paused for review', hasBody: true })

    expect(
      resolveContextPresentation({
        form: 'relay',
        source: { kind: 'agent', senderSessionId: 'sess-123' },
        text: 'hello',
      }),
    ).toEqual({ rendered: 'relay', summary: null, hasBody: true })

    expect(
      resolveContextPresentation({
        form: 'recall',
        source: {
          kind: 'session-reference',
          references: [{ label: 'Design', retainedMessages: 4, omittedMessages: 1, truncated: true }],
        },
        text: 'recalled',
      }),
    ).toEqual({ rendered: 'recall', summary: null, hasBody: true })

    // Malformed instructions falls back to opaque.
    expect(
      resolveContextPresentation({
        form: 'instructions',
        source: { kind: 'agent-instructions', changes: [{ action: 'unknown', path: 'AGENTS.md' }] },
        text: 'fallback text',
      }),
    ).toEqual({ rendered: null, summary: null, hasBody: true })
  })

  it('renders structured instructions, catalog, snapshot, relay, and recall bodies', async () => {
    const recall = await render(
      createElement(NativeContextBody, {
        form: 'recall',
        source: {
          kind: 'session-reference',
          references: [{ label: '上一轮会话', retainedMessages: 3, omittedMessages: 2, truncated: true }],
        },
        text: 'Recalled body',
      }),
    )
    expect(allText(recall)).toContain('上一轮会话')
    expect(allText(recall)).toContain('保留 3 条 · 省略 2 条')
    expect(allText(recall)).toContain('已截断')
    expect(allText(recall)).toContain('Recalled body')
    await act(async () => undefined)
  })
})
