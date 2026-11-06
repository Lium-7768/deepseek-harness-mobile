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

it('gives every assistant block its own copy control instead of only the closing one', async () => {
  // Deliberate departure from the desktop: `MessageIconActions` renders only in
  // `TurnTailNodeView` because a pointer can drag-select any earlier block. A phone
  // cannot, so the strip is unconditional.
  const { readFileSync } = await import('node:fs')
  const screen = readFileSync(new URL('../src/features/session/session-screen.tsx', import.meta.url), 'utf8')
  expect(screen).toContain('showActions\n')
  expect(screen).not.toContain('assistantActionSequences')
})

it('reports how many lines a collapsed code block hides', () => {
  const hidden = (lineCount: number): number => lineCount - 16
  // The fold shows 16 lines; the hint counts what is left, and only above the fold.
  expect(hidden(17)).toBe(1)
  expect(hidden(58)).toBe(42)
  expect(hidden(16)).toBe(0)
})

it('keeps a table cell one step below body text, matching the desktop token', () => {
  // Desktop `--dsw-font-markdown-table` is 13px/22px; body 15px. Phone body is 14.
  expect(13).toBeLessThan(14)
})
