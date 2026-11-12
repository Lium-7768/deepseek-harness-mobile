import { describe, expect, it } from 'vitest'
import { diffFenceStat, isDiffFence, parseDiffFence } from '../src/components/markdown-diff-fence.ts'

describe('which fences are diffs', () => {
  it('recognizes diff and patch, in any case', () => {
    expect(isDiffFence('diff')).toBe(true)
    expect(isDiffFence('PATCH')).toBe(true)
    expect(isDiffFence('Diff')).toBe(true)
  })

  it('leaves every other language to the highlighter', () => {
    for (const language of ['ts', 'python', 'patchy', '', undefined]) expect(isDiffFence(language)).toBe(false)
  })
})

describe('parsing a unified diff', () => {
  it('marks additions and deletions by their marker column', () => {
    const rows = parseDiffFence('@@ -1,2 +1,2 @@\n-old line\n+new line\n context')
    expect(rows.map((row) => row.kind)).toEqual(['hunk', 'del', 'add', 'context'])
  })

  it('keeps every row verbatim, so a copy reproduces the source', () => {
    const source = '@@ -1 +1 @@\n-a\n+b'
    const rows = parseDiffFence(source)
    expect(rows.map((row) => row.raw).join('\n')).toBe(source)
  })

  it('counts additions and deletions for the card header', () => {
    const rows = parseDiffFence('@@ -1,3 +1,3 @@\n-a\n-b\n+c\n context')
    expect(diffFenceStat(rows)).toEqual({ added: 1, removed: 2 })
  })

  it('treats a second file header as chrome once the hunk budget is spent', () => {
    // A concatenated `git diff`: the first file's hunk ends, so the next `---`/`+++`
    // pair names a file rather than a removed and an added line.
    const rows = parseDiffFence(
      ['@@ -1,1 +1,1 @@', '-a', '+b', '--- a/next.ts', '+++ b/next.ts', '@@ -1 +1 @@', '-c', '+d'].join('\n'),
    )
    expect(rows.map((row) => row.kind)).toEqual(['hunk', 'del', 'add', 'meta', 'meta', 'hunk', 'del', 'add'])
  })

  it('keeps authored diff headers as rows when the hunk budget is missing', () => {
    // A hand-written fence without `@@` counts: the `---`/`+++` pair is content, not chrome.
    const rows = parseDiffFence('--- old\n+++ new\n context')
    expect(rows.map((row) => row.kind)).toEqual(['del', 'add', 'context'])
  })

  it('keeps file-level chrome out of the line counts', () => {
    const rows = parseDiffFence(
      ['diff --git a/x.ts b/x.ts', 'index 111..222 100644', '--- a/x.ts', '+++ b/x.ts', '@@ -1 +1 @@', '-a', '+b'].join(
        '\n',
      ),
    )
    expect(diffFenceStat(rows)).toEqual({ added: 1, removed: 1 })
    expect(rows.filter((row) => row.kind === 'meta')).toHaveLength(4)
  })

  it('renders an empty fence as a single context row rather than nothing', () => {
    const rows = parseDiffFence('')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.kind).toBe('context')
  })
})
