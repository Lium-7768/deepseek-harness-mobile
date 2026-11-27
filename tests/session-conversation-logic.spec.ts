import { describe, expect, it } from 'vitest'
import { activeTurnStartedAt, projectNativeConversationRows } from '../src/components/session-conversation-logic.ts'

describe('projectNativeConversationRows', () => {
  it('keeps the desktop conversation distinctions for prose, Think, tools, retry, and terminal errors', () => {
    const rows = projectNativeConversationRows([
      { seq: 1, event: { type: 'turn/start', time: 1_000, data: { turn: 4 } } },
      {
        seq: 2,
        event: {
          type: 'user/message',
          time: 1_100,
          data: { message: { content: [{ type: 'text', text: '继续' }] } },
        },
      },
      {
        seq: 3,
        event: {
          type: 'assistant/message',
          time: 1_200,
          data: {
            message: {
              content: [
                { type: 'reasoning', text: '先检查日志。' },
                { type: 'text', text: '我正在继续检查。' },
                { type: 'tool-call', name: 'bash' },
              ],
            },
          },
        },
      },
      {
        seq: 4,
        event: {
          type: 'tool/call',
          data: { callId: 'call-1', name: 'bash', arguments: { command: 'pwd' }, description: '读取当前目录' },
        },
      },
      {
        seq: 5,
        event: {
          type: 'tool/result',
          data: {
            message: {
              source: { callId: 'call-1' },
              content: [{ type: 'tool-result', isError: true, content: [{ type: 'text', text: 'permission denied' }] }],
            },
          },
        },
      },
      {
        seq: 6,
        event: {
          type: 'llm/retry',
          data: { retry: 1, maxRetries: 2, delayMs: 5_600, failure: { message: '429: rate limited' } },
        },
      },
      {
        seq: 7,
        event: {
          type: 'turn/end',
          data: { turn: 4, reason: { kind: 'error', error: { code: 'MODEL_UNAVAILABLE', message: '模型不可用。' } } },
        },
      },
    ])

    expect(rows).toEqual([
      { kind: 'user', sourceSeq: 2, text: '继续', time: 1_100 },
      { kind: 'reasoning', sourceSeq: 3, text: '先检查日志。' },
      { kind: 'assistant', sourceSeq: 3, text: '我正在继续检查。', time: 1_200 },
      {
        callId: 'call-1',
        kind: 'tool',
        output: 'permission denied',
        sourceSeq: 4,
        state: 'failed',
        summary: '读取当前目录',
        toolInput: '{\n  "command": "pwd"\n}',
        toolName: 'bash',
      },
      {
        delayMs: 5_600,
        failureMessage: '429: rate limited',
        kind: 'retry',
        maxRetries: 2,
        retry: 1,
        sourceSeq: 6,
      },
      { code: 'MODEL_UNAVAILABLE', kind: 'turn-error', message: '模型不可用。', sourceSeq: 7 },
    ])
  })

  it('projects in-progress reasoning and text deltas before a durable assistant message exists', () => {
    expect(
      projectNativeConversationRows([
        {
          seq: 1,
          event: {
            type: 'assistant/chunk',
            data: { turn: 3, step: 2, chunk: { type: 'reasoning-delta', index: 0, text: '分析' } },
          },
        },
        {
          seq: 2,
          event: {
            type: 'assistant/chunk',
            data: { turn: 3, step: 2, chunk: { type: 'reasoning-delta', index: 0, text: '中' } },
          },
        },
        {
          seq: 3,
          event: {
            type: 'assistant/chunk',
            data: { turn: 3, step: 2, chunk: { type: 'text-delta', index: 1, text: '正在' } },
          },
        },
        {
          seq: 4,
          event: {
            type: 'assistant/chunk',
            data: { turn: 3, step: 2, chunk: { type: 'text-delta', index: 1, text: '处理。' } },
          },
        },
      ]),
    ).toEqual([
      { kind: 'reasoning', rowKey: 'step:3:2:reasoning', sourceSeq: 1, text: '分析中' },
      { kind: 'assistant', rowKey: 'step:3:2:assistant', sourceSeq: 3, text: '正在处理。' },
    ])
  })

  it('marks reasoning running only while it is the streaming tail before text or turn end', () => {
    const streamingOnly = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'assistant/chunk',
          data: { turn: 3, step: 2, chunk: { type: 'reasoning-delta', index: 0, text: '思考中' } },
        },
      },
    ])
    expect(streamingOnly).toEqual([
      { kind: 'reasoning', rowKey: 'step:3:2:reasoning', running: true, sourceSeq: 1, text: '思考中' },
    ])

    const afterTurnEnd = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'assistant/chunk',
          data: { turn: 3, step: 2, chunk: { type: 'reasoning-delta', index: 0, text: '思考中' } },
        },
      },
      {
        seq: 2,
        event: { type: 'turn/end', data: { turn: 3, reason: { kind: 'completed' } } },
      },
    ])
    expect(afterTurnEnd).toEqual([{ kind: 'reasoning', rowKey: 'step:3:2:reasoning', sourceSeq: 1, text: '思考中' }])
  })

  it('replaces same-step streaming deltas with the durable assistant message while keeping the row key stable', () => {
    const streaming = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'assistant/chunk',
          data: { turn: 3, step: 2, chunk: { type: 'text-delta', index: 0, text: '临时' } },
        },
      },
    ])
    const settled = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'assistant/chunk',
          data: { turn: 3, step: 2, chunk: { type: 'text-delta', index: 0, text: '临时' } },
        },
      },
      {
        seq: 2,
        event: {
          type: 'assistant/message',
          data: { turn: 3, step: 2, message: { content: [{ type: 'text', text: '最终正文。' }] } },
        },
      },
    ])
    expect(settled).toEqual([
      { kind: 'assistant', rowKey: streaming[0]?.rowKey, sourceSeq: 2, text: '最终正文。', turn: 3 },
    ])
  })

  it("keeps each step's prose ahead of that step's tool rows in a multi-step Turn", () => {
    const rows = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'assistant/chunk',
          data: { turn: 1, step: 0, chunk: { type: 'text-delta', index: 0, text: '第一段' } },
        },
      },
      {
        seq: 2,
        event: {
          type: 'assistant/message',
          data: { turn: 1, step: 0, message: { content: [{ type: 'text', text: '第一段。' }] } },
        },
      },
      {
        seq: 3,
        event: {
          type: 'tool/call',
          data: { turn: 1, step: 0, callId: 'a', name: 'bash', arguments: { command: 'echo a' } },
        },
      },
      {
        seq: 4,
        event: {
          type: 'assistant/chunk',
          data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: '第二段' } },
        },
      },
      {
        seq: 5,
        event: {
          type: 'assistant/message',
          data: { turn: 1, step: 1, message: { content: [{ type: 'text', text: '第二段。' }] } },
        },
      },
      {
        seq: 6,
        event: {
          type: 'tool/call',
          data: { turn: 1, step: 1, callId: 'b', name: 'bash', arguments: { command: 'echo b' } },
        },
      },
    ])
    // The prose of each step stays where the step put it; tool rows follow their own step.
    expect(rows.map((row) => (row.kind === 'assistant' ? row.text : row.kind))).toEqual([
      '第一段。',
      'tool',
      '第二段。',
      'tool',
    ])
  })

  it('returns only the latest unclosed desktop turn start time', () => {
    expect(
      activeTurnStartedAt([
        { seq: 1, event: { type: 'turn/start', time: 1_000, data: { turn: 1 } } },
        { seq: 2, event: { type: 'turn/end', data: { turn: 1 } } },
        { seq: 3, event: { type: 'turn/start', time: 2_000, data: { turn: 2 } } },
      ]),
    ).toBe(2_000)
  })
})

describe('presented deliverables', () => {
  it('lists the files a turn handed over, with their descriptions', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'deliverables/presented',
          data: {
            turn: 2,
            files: [
              { path: '/tmp/out/report.md', description: '本周报告' },
              { path: '/tmp/out/shot.png' },
              { path: '' },
            ],
          },
        },
      },
    ] as never)
    expect(rows).toEqual([
      expect.objectContaining({
        kind: 'deliverables',
        files: [{ path: '/tmp/out/report.md', description: '本周报告' }, { path: '/tmp/out/shot.png' }],
      }),
    ])
  })

  it('adds no row when a presentation carries no readable path', () => {
    const rows = projectNativeConversationRows([
      { seq: 1, event: { type: 'deliverables/presented', data: { files: [{ description: 'x' }] } } },
    ] as never)
    expect(rows).toEqual([])
  })
})

describe('turn triggers', () => {
  it('attributes a turn the reader did not start', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'user/message',
          data: { source: { kind: 'goal' }, message: { content: [{ type: 'text', text: '继续推进目标' }] } },
        },
      },
      {
        seq: 2,
        event: {
          type: 'user/message',
          data: { source: { kind: 'tool-jobs' }, message: { content: [{ type: 'text', text: '作业回报' }] } },
        },
      },
    ] as never)
    expect(rows).toEqual([
      expect.objectContaining({ kind: 'turn-trigger', text: '继续推进目标', trigger: 'goal' }),
      expect.objectContaining({ kind: 'turn-trigger', text: '作业回报', trigger: 'job' }),
    ])
  })

  it('draws injection bookkeeping as context rows, named by their producer', () => {
    const rows = projectNativeConversationRows(
      ['time-context', 'runtime-context', 'skill-catalog', 'agent-instructions', 'repeat-tool-reminder'].map(
        (kind, index) => ({
          seq: index + 1,
          event: {
            type: 'user/message',
            data: { source: { kind }, message: { content: [{ type: 'text', text: 'bookkeeping' }] } },
          },
        }),
      ) as never,
    )
    // The desktop shows these as `上下文注入 · <producer>` disclosures, so the phone
    // keeps them instead of dropping them — but never as a user bubble.
    expect(rows.map((row) => (row.kind === 'context' ? row.producer : row.kind))).toEqual([
      'time-context',
      'runtime-context',
      'skill-catalog',
      'agent-instructions',
      'repeat-tool-reminder',
    ])
  })
})

describe('context rows', () => {
  const message = (source: Record<string, unknown>, content: unknown[]): never =>
    ({ seq: 1, event: { data: { message: { content }, source }, type: 'user/message' } }) as never

  it('titles a single tool change by its tool and a batch by its counts', () => {
    const single = projectNativeConversationRows([
      message({ kind: 'skill-catalog' }, [{ toolName: 'web_search', type: 'tool-addition' }]),
    ])
    expect(single[0]).toMatchObject({ kind: 'context', title: '已添加工具：web_search' })

    const batch = projectNativeConversationRows([
      message({ kind: 'skill-catalog' }, [
        { toolName: 'a', type: 'tool-addition' },
        { toolName: 'b', type: 'tool-addition' },
        { toolName: 'c', type: 'tool-removal' },
      ]),
    ])
    expect(batch[0]).toMatchObject({ kind: 'context', summary: '新增 2 个，移除 1 个' })
  })

  it('names how a settled subagent ended instead of a generic receipt', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 2,
        event: {
          data: {
            message: { content: [{ text: 'done', type: 'text' }] },
            source: { kind: 'subagent-settled', stopReason: 'aborted' },
          },
          type: 'user/message',
        },
      },
    ] as never)
    expect(rows[0]).toMatchObject({ kind: 'turn-trigger', trigger: 'subagentAborted' })
  })

  it('projects system/message events as initial system prompt then updates', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 1,
        event: { data: { message: { content: [{ text: 'Base prompt', type: 'text' }] } }, type: 'system/message' },
      },
      {
        seq: 2,
        event: { data: { message: { content: [{ text: 'Updated prompt', type: 'text' }] } }, type: 'system/message' },
      },
    ] as never)
    expect(rows[0]).toMatchObject({ kind: 'context', role: 'system', title: '系统提示词', text: 'Base prompt' })
    expect(rows[1]).toMatchObject({
      kind: 'context',
      role: 'system',
      title: '系统提示词更新',
      text: 'Updated prompt',
    })
  })

  it('projects session-reference recall, agent-instructions paths, and skill-invocation names', () => {
    const rows = projectNativeConversationRows([
      message({ kind: 'session-reference', references: [{ label: '上一轮会话' }, { label: '设计文档' }] }, [
        { text: 'Recalled body', type: 'text' },
      ]),
      message({ kind: 'agent-instructions', changes: [{ path: 'AGENTS.md' }] }, [
        { text: 'Instructions', type: 'text' },
      ]),
      message({ kind: 'skill-invocation', name: 'code-review' }, [{ text: 'Skill body', type: 'text' }]),
    ])
    expect(rows[0]).toMatchObject({ kind: 'context', role: 'recall', producer: '上一轮会话, 设计文档' })
    expect(rows[1]).toMatchObject({ kind: 'context', producer: 'AGENTS.md' })
    expect(rows[2]).toMatchObject({ kind: 'context', producer: 'code-review' })
  })

  it('gives batch tool changes a desktop title and expandable tool names', () => {
    const rows = projectNativeConversationRows([
      message({ kind: 'skill-catalog' }, [
        { toolName: 'alpha', type: 'tool-addition' },
        { toolName: 'beta', type: 'tool-removal' },
      ]),
    ])
    expect(rows[0]).toMatchObject({
      kind: 'context',
      title: '工具已更新',
      summary: '新增 1 个，移除 1 个',
    })
    expect(rows[0]?.kind === 'context' ? rows[0].text : '').toContain('新增：alpha')
    expect(rows[0]?.kind === 'context' ? rows[0].text : '').toContain('移除：beta')
  })

  it('collapses consecutive llm/retry attempts for the same step into one row', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 10,
        event: {
          type: 'llm/retry',
          data: { turn: 1, step: 1, retry: 1, maxRetries: 5, delayMs: 1000, error: { message: '429' } },
        },
      },
      {
        seq: 11,
        event: {
          type: 'llm/retry',
          data: { turn: 1, step: 1, retry: 3, maxRetries: 5, delayMs: 4000, error: { message: '429' } },
        },
      },
      {
        seq: 12,
        event: {
          type: 'llm/retry',
          data: { turn: 1, step: 2, retry: 1, maxRetries: 5, delayMs: 1000, error: { message: '503' } },
        },
      },
    ] as never)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ kind: 'retry', sourceSeq: 10, retry: 3, maxRetries: 5, delayMs: 4000 })
    expect(rows[1]).toMatchObject({ kind: 'retry', sourceSeq: 12, retry: 1, maxRetries: 5, delayMs: 1000 })
  })
})

describe('turn usage', () => {
  it('sums one turn across its assistant messages and leaves other turns apart', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          data: {
            message: { content: [{ text: 'a', type: 'text' }] },
            turn: 1,
            usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 },
          },
          type: 'assistant/message',
        },
      },
      {
        seq: 2,
        event: {
          data: {
            message: { content: [{ text: 'b', type: 'text' }] },
            turn: 1,
            usage: { inputTokens: 200, outputTokens: 20, totalTokens: 220 },
          },
          type: 'assistant/message',
        },
      },
      {
        seq: 3,
        event: {
          data: {
            message: { content: [{ text: 'c', type: 'text' }] },
            turn: 2,
            usage: { inputTokens: 50, outputTokens: 5, totalTokens: 55 },
          },
          type: 'assistant/message',
        },
      },
    ] as never)
    const usage = rows.map((row) => (row.kind === 'assistant' ? row.usage : undefined))
    expect(usage[0]).toEqual({ calls: 2, inputTokens: 300, outputTokens: 30, totalTokens: 330 })
    expect(usage[1]).toEqual({ calls: 2, inputTokens: 300, outputTokens: 30, totalTokens: 330 })
    expect(usage[2]).toEqual({ calls: 1, inputTokens: 50, outputTokens: 5, totalTokens: 55 })
  })

  it('aggregates cache, reasoning, and model routes only when every billed attempt reports them', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          data: {
            message: {
              content: [{ text: 'a', type: 'text' }],
              source: { provider: 'deepseek', model: 'deepseek-reasoner' },
            },
            turn: 1,
            usage: {
              inputTokens: 1000,
              outputTokens: 200,
              totalTokens: 1200,
              cacheReadTokens: 800,
              cacheWriteTokens: 50,
              reasoningTokens: 120,
            },
          },
          type: 'assistant/message',
        },
      },
      {
        seq: 2,
        event: {
          data: {
            message: {
              content: [{ text: 'b', type: 'text' }],
              source: { provider: 'deepseek', model: 'deepseek-reasoner' },
            },
            turn: 1,
            usage: {
              inputTokens: 500,
              outputTokens: 100,
              totalTokens: 600,
              cacheReadTokens: 400,
              cacheWriteTokens: 0,
              reasoningTokens: 30,
            },
          },
          type: 'assistant/message',
        },
      },
    ] as never)
    expect(rows[0]?.kind === 'assistant' ? rows[0].usage : undefined).toEqual({
      calls: 2,
      inputTokens: 1500,
      outputTokens: 300,
      totalTokens: 1800,
      cacheReadTokens: 1200,
      cacheWriteTokens: 50,
      reasoningTokens: 150,
      routes: [{ provider: 'deepseek', model: 'deepseek-reasoner' }],
    })
  })

  it('tracks preparing tool-call deltas and settles them in place when tool/call arrives', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'assistant/chunk',
          data: {
            turn: 1,
            step: 1,
            chunk: { type: 'tool-call-delta', id: 'call-1', name: 'read', argumentsDelta: '{"file_path":' },
          },
        },
      },
      {
        seq: 2,
        event: {
          type: 'assistant/chunk',
          data: {
            turn: 1,
            step: 1,
            chunk: { type: 'tool-call-delta', id: 'call-1', argumentsDelta: '"a.ts"}' },
          },
        },
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      kind: 'tool',
      callId: 'call-1',
      preparing: true,
      state: 'running',
      toolName: 'read',
      toolInput: '{"file_path":"a.ts"}',
    })

    const settled = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'assistant/chunk',
          data: {
            turn: 1,
            step: 1,
            chunk: { type: 'tool-call-delta', id: 'call-1', name: 'read', argumentsDelta: '{"file_path":"a.ts"}' },
          },
        },
      },
      {
        seq: 3,
        event: {
          type: 'tool/call',
          data: { turn: 1, step: 1, callId: 'call-1', name: 'read', arguments: '{"file_path":"a.ts"}' },
        },
      },
    ])
    expect(settled).toHaveLength(1)
    expect(settled[0]?.kind === 'tool' && settled[0].preparing).toBeUndefined()
    expect(settled[0]).toMatchObject({ kind: 'tool', callId: 'call-1', state: 'running', toolName: 'read' })
  })

  it('preserves leading spaces and newline-only streaming deltas in text and reasoning chunks', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'assistant/chunk',
          data: { turn: 1, step: 1, chunk: { type: 'reasoning-delta', index: 0, text: 'Line 1' } },
        },
      },
      {
        seq: 2,
        event: {
          type: 'assistant/chunk',
          data: { turn: 1, step: 1, chunk: { type: 'reasoning-delta', index: 0, text: '\n\n' } },
        },
      },
      {
        seq: 3,
        event: {
          type: 'assistant/chunk',
          data: { turn: 1, step: 1, chunk: { type: 'reasoning-delta', index: 0, text: 'Line 2' } },
        },
      },
      {
        seq: 4,
        event: {
          type: 'assistant/chunk',
          data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 1, text: 'Hello' } },
        },
      },
      {
        seq: 5,
        event: {
          type: 'assistant/chunk',
          data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 1, text: ' ' } },
        },
      },
      {
        seq: 6,
        event: {
          type: 'assistant/chunk',
          data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 1, text: 'world' } },
        },
      },
    ])
    expect(rows[0]).toMatchObject({ kind: 'reasoning', text: 'Line 1\n\nLine 2' })
    expect(rows[1]).toMatchObject({ kind: 'assistant', text: 'Hello world' })
  })

  it('deduplicates secondary streamed blocks on assistant/message settlement and settles aborted preparing tools on turn/end', () => {
    const settled = projectNativeConversationRows([
      {
        seq: 1,
        event: {
          type: 'assistant/chunk',
          data: { turn: 2, step: 1, chunk: { type: 'text-delta', index: 0, text: 'part A' } },
        },
      },
      {
        seq: 2,
        event: {
          type: 'assistant/chunk',
          data: { turn: 2, step: 1, chunk: { type: 'text-delta', index: 2, text: 'part B' } },
        },
      },
      {
        seq: 3,
        event: {
          type: 'assistant/message',
          data: {
            turn: 2,
            step: 1,
            message: {
              content: [
                { type: 'text', text: 'part A' },
                { type: 'text', text: 'part B' },
              ],
            },
          },
        },
      },
    ])
    expect(settled.filter((row) => row.kind === 'assistant')).toHaveLength(1)
    expect(settled[0]).toMatchObject({ kind: 'assistant', text: 'part Apart B' })

    const aborted = projectNativeConversationRows([
      {
        seq: 10,
        event: {
          type: 'assistant/chunk',
          data: {
            turn: 3,
            step: 1,
            chunk: { type: 'tool-call-delta', id: 'c-abort', name: 'bash', argumentsDelta: '{"cmd":' },
          },
        },
      },
      { seq: 11, event: { type: 'turn/end', data: { turn: 3, reason: { kind: 'aborted' } } } },
    ])
    expect(aborted).toEqual([
      { kind: 'tool', callId: 'c-abort', state: 'failed', toolName: 'bash', toolInput: '{"cmd":', sourceSeq: 10 },
    ])
  })
})
