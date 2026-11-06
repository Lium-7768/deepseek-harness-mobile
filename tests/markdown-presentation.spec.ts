import { expect, it } from 'vitest'
import { markdownBlockGap, markdownLinkTarget } from '@/components/markdown-blocks'

it('models collapsed desktop block spacing without doubling native heading gaps', () => {
  expect(markdownBlockGap({ kind: 'heading', level: 2, text: 'Title' })).toBe(0)
  expect(markdownBlockGap({ kind: 'heading', level: 2, text: 'Title' }, { kind: 'paragraph', text: 'Intro' })).toBe(28)
  expect(markdownBlockGap({ kind: 'list', text: '' }, { kind: 'heading', level: 4, text: 'Title' })).toBe(8)
  expect(markdownBlockGap({ kind: 'code', text: 'const x = 1' }, { kind: 'paragraph', text: 'Text' })).toBe(16)
})

it('keeps desktop file paths inert and exposes supported external links', () => {
  expect(markdownLinkTarget('[Docs](https://reactnative.dev/)')).toEqual({
    label: 'Docs',
    url: 'https://reactnative.dev/',
  })
  expect(markdownLinkTarget('[File](/projects/README.md)')).toEqual({ label: 'File' })
  expect(markdownLinkTarget('[Code](javascript:alert(1))').url).toBeUndefined()
})

import { highlightCode } from '@/components/code-highlighting'

it('highlights declared code while preserving every character, indentation and newline', () => {
  const code = '// one comment\nconst answer: string = "hello"\n  console.log(answer)\n'
  const tokens = highlightCode(code, 'ts')
  expect(tokens.map((token) => token.text).join('')).toBe(code)
  expect(tokens.some((token) => token.kind === 'keyword')).toBe(true)
  expect(tokens.some((token) => token.kind === 'string')).toBe(true)
  expect(tokens.some((token) => token.kind === 'comment')).toBe(true)
  expect(highlightCode(code, 'unsupported-language')).toEqual([{ text: code }])
})

it('keeps every mid-turn assistant block copyable through selection, not the action strip', async () => {
  // Desktop parity: `MessageIconActions` lives in `TurnTailNodeView`, so only a turn's
  // closing assistant block carries the copy button. Mid-turn text has to stay copyable
  // another way, which is why every markdown block is selectable.
  const { assistantActionSequences } = await import('@/components/conversation-flow')
  const rows = [
    { kind: 'assistant', sourceSeq: 2, text: 'first half', rowKey: 'a1' },
    { kind: 'tool', sourceSeq: 3, rowKey: 't1' },
    { kind: 'assistant', sourceSeq: 4, text: 'second half', rowKey: 'a2' },
  ] as never
  const spans = [{ startSeq: 1, endSeq: 9 }] as never
  const actionSeqs = assistantActionSequences(rows, spans)
  // Only the closing block owns the strip.
  expect(actionSeqs.has(4)).toBe(true)
  expect(actionSeqs.has(2)).toBe(false)
})
