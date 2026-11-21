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
  it('reads the questions a call asked with the answers recorded for them', () => {
    const view = toolRowView(
      call(
        'ask_user_question',
        {
          questions: [
            {
              id: 'q1',
              question: '隐藏哪些？',
              header: '选择要改的项',
              options: [{ label: '轮次导航条' }, { label: '子代理计数' }],
              multiSelect: true,
            },
          ],
        },
        JSON.stringify({
          answers: [{ id: 'q1', selected: ['轮次导航条', '子代理计数'] }],
        }),
      ),
    )
    expect(view).toMatchObject({
      kind: 'question',
      answered: true,
      items: [
        {
          question: '隐藏哪些？',
          options: ['轮次导航条', '子代理计数'],
          answers: ['轮次导航条', '子代理计数'],
        },
      ],
    })
  })

  it('keeps a question unanswered while the result carries no answer', () => {
    const view = toolRowView(
      call('ask_user_question', { questions: [{ id: 'q1', question: '继续吗？', options: [{ label: '是' }] }] }),
    )
    expect(view).toMatchObject({ kind: 'question', answered: false, items: [{ answers: [] }] })
  })

  it('summarises a question row by the question itself, not the tool name', () => {
    const view = toolRowView(call('ask_user_question', { questions: [{ id: 'q1', question: '隐藏哪些？' }] }))
    expect(describeRow(view)).toBe('隐藏哪些？')
  })

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

describe('metadata that is present but empty', () => {
  // The wire keeps `meta: null` rather than omitting the field, and a real session
  // carried one, so the derivation has to survive it rather than dereference it.
  it('survives a null metadata field', () => {
    const view = toolRowView({
      toolName: 'bash',
      toolInput: JSON.stringify({ command: 'ls' }),
      toolMeta: null,
      state: 'completed',
    })
    expect(view).toMatchObject({ kind: 'command', command: 'ls' })
  })
})

describe('a recorded path is not by itself a mutation', () => {
  // Every tool result records the path it worked on. Only a mutation also records what it
  // did, so `operation` is what separates a write from a read that merely named a file.
  it('does not read a bare path as a write', () => {
    const view = toolRowView({
      toolName: 'read_image',
      toolMeta: { path: '/tmp/shot.png' },
      state: 'completed',
    })
    expect(view.kind).toBe('generic')
  })

  it('reads a path with an operation as a write', () => {
    const view = toolRowView({
      toolName: 'write',
      toolMeta: { operation: 'create', path: '/a/b.ts' },
      state: 'completed',
    })
    expect(view).toMatchObject({ kind: 'mutation', path: '/a/b.ts' })
  })
})

describe('the tools this session actually used most', () => {
  // `run_code` and `job_output` were the two most frequent families after `bash`, and
  // both read as raw JSON before they had a kind.
  it('names a code snippet by its language and first line', () => {
    const view = toolRowView(
      call('run_code', { code: '\nconst r = await tools.bash({ command: "ls" })', language: 'js' }),
    )
    expect(view).toMatchObject({ kind: 'code', language: 'js' })
    expect(describeRow(view)).toBe('js · const r = await tools.bash({ command: "ls" })')
  })

  it('names the job a waiting read blocks on', () => {
    const view = toolRowView(call('job_output', { job_id: 'bash-abc123', wait: true }))
    expect(view).toMatchObject({ kind: 'job', jobId: 'bash-abc123', waiting: true })
    expect(describeRow(view)).toBe('bash-abc123 · 等待中')
  })

  it('leaves the wait off when the read does not block', () => {
    expect(describeRow(toolRowView(call('job_output', { job_id: 'bash-abc123' })))).toBe('bash-abc123')
  })
})

describe('arguments that arrive already parsed', () => {
  // The Host records `arguments` as JSON text for some tools and as an object for others;
  // a real session carried both. Reading only text lost 96 of 410 calls.
  it('reads an object argument directly', () => {
    const view = toolRowView({
      toolName: 'bash',
      toolInput: { command: 'ls -la', description: 'List files' },
      state: 'completed',
    })
    expect(view).toMatchObject({ kind: 'command', description: 'List files' })
  })
})

describe('the tools that name one subject each', () => {
  it('names the skill a call loaded', () => {
    const view = toolRowView(call('skill', { name: 'autoglm-browser-agent' }))
    expect(view).toMatchObject({ kind: 'skill', skillName: 'autoglm-browser-agent' })
    expect(describeRow(view)).toBe('autoglm-browser-agent')
  })

  it('reports what a goal call did, and why when it blocked', () => {
    const blocked = toolRowView(call('update_goal', { action: 'blocked', blocked_reason: 'awaiting review' }))
    expect(describeRow(blocked)).toBe('blocked · awaiting review')
    const done = toolRowView(call('update_goal', { action: 'complete' }))
    expect(describeRow(done)).toBe('complete')
  })

  // A read with no arguments names nothing, so it stays generic rather than inventing one.
  it('leaves an argument-free read generic', () => {
    expect(toolRowView(call('get_goal', {}))).toMatchObject({ kind: 'generic' })
  })
})
