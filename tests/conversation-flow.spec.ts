import { describe, expect, it } from 'vitest'
import { conversationFlowGap, conversationRowKey } from '@/components/conversation-flow'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { foldCompletedTurns, turnSpans } from '@/components/session-turn-logic'
import { groupProcessRows } from '@/components/session-process-logic'
import { projectNativeConversationRows } from '@/components/session-conversation-logic'

describe('complete conversation flow', () => {
  it('folds a finished turn and leaves a running turn flat', () => {
    // The action strip is unconditional on the phone, so this spec covers the fold rule
    // alone: a finished turn's process rows collapse into one control, while a running
    // turn keeps its live header and its reply stays a plain assistant row.
    const items = [
      { seq: 1, event: { type: 'user/message', data: { content: [{ type: 'text', text: 'Check' }] } } },
      { seq: 2, event: { type: 'turn/start', data: { turn: 1 }, time: 1000 } },
      { seq: 3, event: { type: 'tool/call', data: { callId: 'read', name: 'read', arguments: '{}' } } },
      {
        seq: 4,
        event: {
          type: 'tool/result',
          data: {
            message: {
              source: { callId: 'read' },
              content: [{ type: 'tool-result', content: [{ type: 'text', text: 'ok' }] }],
            },
          },
        },
      },
      { seq: 5, event: { type: 'turn/end', data: { turn: 1 }, time: 2000 } },
      { seq: 6, event: { type: 'user/message', data: { content: [{ type: 'text', text: 'Again' }] } } },
      { seq: 7, event: { type: 'turn/start', data: { turn: 2 }, time: 3000 } },
      { seq: 8, event: { type: 'tool/call', data: { callId: 'grep', name: 'grep', arguments: '{}' } } },
      {
        seq: 9,
        event: { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'Working' }] } } },
      },
    ]
    const projected = projectNativeConversationRows(items)
    const folded = foldCompletedTurns(groupProcessRows(projected, { running: true }), { spans: turnSpans(items) })
    // Turn 1 folded into one control; the running turn keeps its own header.
    expect(folded.filter((row) => row.kind === 'turn')).toHaveLength(1)
    expect(folded.at(-1)?.kind).toBe('assistant')
  })

  it('keeps every tool result paired, folds two turns separately, and gives rows stable keys', () => {
    const items = [
      { seq: 1, event: { type: 'user/message', data: { content: [{ type: 'text', text: 'Check' }] } } },
      { seq: 2, event: { type: 'turn/start', data: { turn: 1 }, time: 1000 } },
      { seq: 3, event: { type: 'tool/call', data: { callId: 'read', name: 'read', arguments: '{}' } } },
      {
        seq: 4,
        event: {
          type: 'tool/result',
          data: {
            message: {
              source: { callId: 'read' },
              content: [{ type: 'tool-result', content: [{ type: 'text', text: 'ok' }] }],
            },
          },
        },
      },
      {
        seq: 5,
        event: { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'Done' }] } } },
      },
      { seq: 6, event: { type: 'turn/end', data: { turn: 1 }, time: 2000 } },
    ]
    const projected = projectNativeConversationRows(items)
    const rows = foldCompletedTurns(groupProcessRows(projected, { running: false }), { spans: turnSpans(items) })
    expect(rows.map((row) => row.kind)).toEqual(['user', 'turn', 'assistant'])
    expect(projected.find((row) => row.kind === 'tool')).toMatchObject({ state: 'completed', output: 'ok' })
    const keys = rows.map(conversationRowKey)
    expect(new Set(keys).size).toBe(keys.length)
    expect(conversationRowKey(rows[2], 8)).toBe(conversationRowKey(rows[2], 100))
  })

  it('uses compact process spacing and larger input/response boundaries', () => {
    const retry = {
      kind: 'retry' as const,
      sourceSeq: 3,
      delayMs: 1000,
      failureMessage: 'retry',
      retry: 1,
      maxRetries: 5,
    }
    const answer = { kind: 'assistant' as const, sourceSeq: 4, text: 'answer' }
    expect(conversationFlowGap(retry, retry)).toBe(4)
    expect(conversationFlowGap(answer, retry)).toBe(12)
    expect(conversationFlowGap({ kind: 'user', text: 'next' }, answer)).toBe(24)
  })
})
