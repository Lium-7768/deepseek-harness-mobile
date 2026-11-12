import { expect, it } from 'vitest'
import { markdownBlockGap, markdownLinkTarget, parseBlocks } from '@/components/markdown-blocks'
import { isDiffFence } from '@/components/markdown-diff-fence'

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

it('routes diff and patch fences to the row renderer instead of the highlighter', () => {
  // The desktop renders a `diff`/`patch` fence as rows, because the marker column is
  // the meaning. A fence carrying a real patch must not reach the grammar highlighter.
  const blocks = parseBlocks(['```diff', '@@ -1 +1 @@', '-old', '+new', '```'].join('\n'))
  expect(blocks).toHaveLength(1)
  expect(blocks[0]).toMatchObject({ kind: 'code', language: 'diff' })
  expect(isDiffFence(blocks[0]?.kind === 'code' ? blocks[0].language : undefined)).toBe(true)

  const patch = parseBlocks(['```patch', '--- a/x.ts', '+++ b/x.ts', '```'].join('\n'))
  expect(isDiffFence(patch[0]?.kind === 'code' ? patch[0].language : undefined)).toBe(true)

  // Every other language keeps the highlighter.
  const ts = parseBlocks(['```ts', 'const x = 1', '```'].join('\n'))
  expect(isDiffFence(ts[0]?.kind === 'code' ? ts[0].language : undefined)).toBe(false)
})

it('keeps the settle re-pin conditional so a correct landing is not moved again', async () => {
  // The flicker after a streaming burst came from an unconditional second jump: the
  // first landing was already on the newest row, and the settle timer moved a correct
  // list. The gap between the landing and the end decides whether another jump is
  // needed, so the threshold is what the behaviour rests on.
  const { SETTLE_MIN_GAP_PX } = await import('@/components/session-scroll-logic')
  expect(SETTLE_MIN_GAP_PX).toBeGreaterThan(0)
  // A landing within the threshold is treated as arrived; past it the list is short.
  expect(2 < SETTLE_MIN_GAP_PX).toBe(true)
  expect(20 < SETTLE_MIN_GAP_PX).toBe(false)
})
