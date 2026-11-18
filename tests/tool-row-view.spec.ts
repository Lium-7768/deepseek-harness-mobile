import { describe, expect, it } from 'vitest'
import { toolRowView } from '../src/components/tool-row-view.ts'

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
