import { describe, expect, it } from 'vitest'
import { sessionWindow, LIVE_WINDOW_LIMIT } from '@/sync/session-window'
import type { SessionEventItem } from '@/types/mobile'
import { projectNativeConversationRows } from '@/components/session-conversation-logic'

describe('mobile conversation event window', () => {
  it('drops transient deltas only once their authoritative message exists', () => {
    const chunks: SessionEventItem[] = Array.from({ length: 5000 }, (_, i) => ({
      seq: i + 1,
      event: {
        type: 'assistant/chunk',
        data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'a' } },
      },
    }))
    expect(sessionWindow(chunks).items).toHaveLength(5000)
    const settled = {
      seq: 5001,
      event: {
        type: 'assistant/message',
        data: { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'a'.repeat(5000) }] } },
      },
    }
    const window = sessionWindow([...chunks, settled])
    expect(window.items).toEqual([settled])
    expect(projectNativeConversationRows(window.items)).toEqual(projectNativeConversationRows([...chunks, settled]))
  })

  it('evicts complete older turns and retains their sequence cursor for history pagination', () => {
    const items: SessionEventItem[] = Array.from({ length: 1000 }, (_, turn) => [
      { seq: turn * 3, event: { type: 'turn/start' } },
      { seq: turn * 3 + 1, event: { type: 'user/message', data: { content: [{ type: 'text', text: `${turn}` }] } } },
      { seq: turn * 3 + 2, event: { type: 'turn/end' } },
    ]).flat()
    const window = sessionWindow(items)
    expect(window.truncated).toBe(true)
    expect(window.items.length).toBeLessThanOrEqual(LIVE_WINDOW_LIMIT)
    expect(window.items[0].event.type).toBe('turn/start')
    expect(window.items.at(-1)).toEqual(items.at(-1))
  })
})
