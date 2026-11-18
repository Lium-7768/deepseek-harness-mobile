import { describe, expect, it } from 'vitest'
import { describeRow, toolRowView } from '../src/components/tool-row-view.ts'

/** Build a call with JSON arguments from an object, the way the projection carries them. */
function call(toolName: string, args: unknown, output?: string) {
  return {
    toolName,
    toolInput: JSON.stringify(args),
    ...(output === undefined ? {} : { output }),
    state: 'completed' as const,
  }
}

describe('tool row derivation', () => {
  it('names the file a read opened, with the line count it returned', () => {
    const view = toolRowView(call('read', { file_path: '/a/b.ts' }, 'one\ntwo\nthree'))
    expect(view).toMatchObject({ kind: 'read', path: '/a/b.ts', lineCount: 3 })
  })

  // Tools spell the same argument differently; the row asks for every spelling.
  it('accepts the argument under any of the names a read uses', () => {
    expect(toolRowView(call('read', { path: '/x.ts' }))).toMatchObject({ kind: 'read', path: '/x.ts' })
    expect(toolRowView(call('read_file', { file: '/y.ts' }))).toMatchObject({ kind: 'read', path: '/y.ts' })
  })

  it('reports a search as its pattern, scope, and hit counts', () => {
    const view = toolRowView(call('grep', { pattern: 'needle', path: 'src' }, 'a.ts:1: hit\nb.ts:7: hit\nb.ts:9: hit'))
    expect(view).toMatchObject({ kind: 'search', pattern: 'needle', scope: 'src', hitFiles: 2, hitLines: 3 })
  })

  it('falls back to a generic row when the call names nothing to show', () => {
    expect(toolRowView(call('mystery_tool', {}, 'raw'))).toMatchObject({ kind: 'generic' })
  })

  it('reads a todo list out of the arguments', () => {
    const view = toolRowView(
      call('todo_write', {
        todos: [
          { content: 'first', status: 'completed' },
          { content: 'second', status: 'in_progress' },
        ],
      }),
    )
    expect(view).toMatchObject({
      kind: 'todo',
      items: [
        { status: 'completed', text: 'first' },
        { status: 'in_progress', text: 'second' },
      ],
    })
  })

  it('reads a todo list out of the printed result when the arguments carry none', () => {
    const view = toolRowView(call('todo_write', {}, '- [x] done\n- [ ] open'))
    expect(view).toMatchObject({
      kind: 'todo',
      items: [
        { status: 'completed', text: 'done' },
        { status: 'pending', text: 'open' },
      ],
    })
  })

  it('names the command a shell call ran', () => {
    expect(toolRowView(call('bash', { command: 'ls -la' }))).toMatchObject({ kind: 'command', command: 'ls -la' })
  })

  it('survives argument text that is not JSON', () => {
    const view = toolRowView({ toolName: 'read', toolInput: 'not json', state: 'completed' })
    expect(view).toMatchObject({ kind: 'generic' })
  })
})

describe('file mutations read from the call metadata', () => {
  it('names the file a write touched and what it did', () => {
    const view = toolRowView({
      toolName: 'write',
      toolInput: JSON.stringify({ path: '/a/b.ts' }),
      toolMeta: { operation: 'create', path: '/a/b.ts' },
      state: 'completed',
    })
    expect(view).toMatchObject({ kind: 'mutation', path: '/a/b.ts', operation: 'create' })
  })

  it('describes a mutation as its verb and path', () => {
    const text = describeRow({ kind: 'mutation', path: '/a/b.ts', operation: 'create' })
    expect(text).toContain('新建')
    expect(text).toContain('/a/b.ts')
  })

  // The metadata names the file even when the arguments do not repeat it.
  it('finds the path in the metadata alone', () => {
    const view = toolRowView({
      toolName: 'edit',
      toolMeta: { operation: 'update', path: '/c/d.ts' },
      state: 'completed',
    })
    expect(view).toMatchObject({ kind: 'mutation', path: '/c/d.ts' })
  })
})

describe('rows whose tool family names a file', () => {
  it('names the office document and the format it converts to', () => {
    const view = toolRowView(call('office_convert', { input: '/a/report.docx', format: 'pdf' }))
    expect(view).toMatchObject({ kind: 'office', path: '/a/report.docx', format: 'pdf' })
    expect(describeRow(view)).toBe('/a/report.docx → pdf')
  })

  it('names the image a read opened', () => {
    expect(toolRowView(call('read_image', { path: '/tmp/shot.png' }))).toMatchObject({
      kind: 'image',
      path: '/tmp/shot.png',
    })
  })
})

describe('a shell call reads as its description first', () => {
  // The desktop's bash row prefers the model-written description over the command line:
  // a sentence reads in a flow where a shell invocation does not.
  it('prefers the description over the command line', () => {
    const view = toolRowView(call('bash', { command: 'grep -rn foo . | head -50', description: 'Find the call sites' }))
    expect(describeRow(view)).toBe('Find the call sites')
  })

  it('falls back to the command when the call carries no description', () => {
    expect(describeRow(toolRowView(call('bash', { command: 'ls -la' })))).toBe('ls -la')
  })
})
