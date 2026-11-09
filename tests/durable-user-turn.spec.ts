import { describe, expect, it } from 'vitest'
import { projectNativeConversationRows } from '../src/components/session-conversation-logic.ts'

describe('durable user turns', () => {
  it('renders a human turn whose content sits on the data, not under message', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 8,
        event: {
          data: {
            content: [{ text: '用 write 工具写三行', type: 'text' }],
            id: 'msg-1',
            role: 'user',
            source: { kind: 'user', rpcId: 'rpc-1' },
          },
          seq: 8,
          type: 'user/message',
        },
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'user', text: '用 write 工具写三行' })
  })

  it('keeps a user turn that carries no source at all', () => {
    const rows = projectNativeConversationRows([
      { seq: 2, event: { data: { content: [{ text: '继续', type: 'text' }] }, type: 'user/message' } },
    ])
    expect(rows.map((row) => row.kind)).toEqual(['user'])
  })

  it('renders injected context as context rows, never as a user bubble', () => {
    const context = ['runtime-context', 'skill-catalog', 'time-context', 'agent-instructions', 'compact-checkpoint']
    const rows = projectNativeConversationRows(
      context.map((kind, index) => ({
        seq: index + 1,
        event: {
          data: { content: [{ text: `${kind} payload`, type: 'text' }], source: { kind } },
          type: 'user/message',
        },
      })),
    )
    expect(rows.every((row) => row.kind === 'context')).toBe(true)
    // A compaction checkpoint owns its own row, so it is not repeated as context.
    expect(rows.map((row) => (row.kind === 'context' ? row.producer : row.kind))).toEqual([
      'runtime-context',
      'skill-catalog',
      'time-context',
      'agent-instructions',
    ])
  })

  it('still reads a settled assistant message from its nested payload', () => {
    const rows = projectNativeConversationRows([
      {
        seq: 3,
        event: {
          data: { message: { content: [{ text: '写好了。', type: 'text' }], role: 'assistant' } },
          type: 'assistant/message',
        },
      },
    ])
    expect(rows[0]).toMatchObject({ kind: 'assistant', text: '写好了。' })
  })
})
