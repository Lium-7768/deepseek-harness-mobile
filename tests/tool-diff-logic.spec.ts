import { describe, expect, it } from 'vitest'
import { lineDiff, toolFileChange } from '../src/components/tool-diff-logic.ts'

describe('lineDiff', () => {
  it('marks a replaced line and keeps the surrounding context', () => {
    expect(lineDiff('a\nb\nc', 'a\nB\nc')).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'added', text: 'B' },
      { kind: 'context', text: 'c' },
    ])
  })

  it('treats a new file as entirely added', () => {
    expect(lineDiff(null, 'one\ntwo')).toEqual([
      { kind: 'added', text: 'one' },
      { kind: 'added', text: 'two' },
    ])
  })

  it('keeps a line an edit only moved as context around the change', () => {
    expect(lineDiff('a\nb\nc', 'c\na\nb')).toEqual([
      { kind: 'added', text: 'c' },
      { kind: 'context', text: 'a' },
      { kind: 'context', text: 'b' },
      { kind: 'removed', text: 'c' },
    ])
  })

  it('ignores a single trailing newline so a whole-file write is not one long change', () => {
    expect(lineDiff('a\nb\n', 'a\nb')).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'context', text: 'b' },
    ])
  })

  it('treats empty content as no lines', () => {
    expect(lineDiff('', '')).toEqual([])
    expect(lineDiff('a', '')).toEqual([{ kind: 'removed', text: 'a' }])
  })
})

describe('toolFileChange', () => {
  it('reads an edit call as a change to its file', () => {
    const change = toolFileChange(
      'edit',
      JSON.stringify({
        file_path: 'src/theme/index.ts',
        new_string: 'stateDone: violet',
        old_string: 'stateDone: blue',
      }),
    )
    expect(change?.path).toBe('src/theme/index.ts')
    expect(change?.added).toBe(1)
    expect(change?.removed).toBe(1)
    expect(change?.lines).toEqual([
      { kind: 'removed', text: 'stateDone: blue' },
      { kind: 'added', text: 'stateDone: violet' },
    ])
  })

  it('reads a write call as a new file', () => {
    const change = toolFileChange('write', JSON.stringify({ content: 'line one', file_path: 'docs/a.md' }))
    expect(change?.added).toBe(1)
    expect(change?.removed).toBe(0)
  })

  it('reads a str_replace_editor create call', () => {
    const change = toolFileChange(
      'str_replace_editor',
      JSON.stringify({
        command: 'create',
        file_text: 'fresh',
        path: 'app/new.tsx',
      }),
    )
    expect(change?.path).toBe('app/new.tsx')
    expect(change?.added).toBe(1)
  })

  it('reads a str_replace_editor replace call', () => {
    const change = toolFileChange(
      'str_replace_editor',
      JSON.stringify({
        command: 'str_replace',
        new_str: 'after',
        old_str: 'before',
        path: 'a.ts',
      }),
    )
    expect(change?.removed).toBe(1)
    expect(change?.added).toBe(1)
  })

  it('declines a call that changes no file', () => {
    expect(toolFileChange('bash', JSON.stringify({ command: 'ls' }))).toBeUndefined()
    expect(toolFileChange('read', JSON.stringify({ file_path: 'a.ts' }))).toBeUndefined()
    expect(toolFileChange('str_replace_editor', JSON.stringify({ command: 'view', path: 'a.ts' }))).toBeUndefined()
  })

  it('declines a call it cannot read', () => {
    expect(toolFileChange('edit', undefined)).toBeUndefined()
    expect(toolFileChange('edit', '')).toBeUndefined()
    expect(toolFileChange('edit', 'not json')).toBeUndefined()
    expect(toolFileChange('edit', JSON.stringify(['file_path']))).toBeUndefined()
    expect(toolFileChange('edit', JSON.stringify({ file_path: 'a.ts' }))).toBeUndefined()
    expect(toolFileChange('write', JSON.stringify({ file_path: '   ', content: 'x' }))).toBeUndefined()
  })
})
