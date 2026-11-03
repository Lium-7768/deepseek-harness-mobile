import { describe, expect, it } from 'vitest'
import { collectSessionHistory } from '../src/export/session-history.ts'
import { renderSessionLog, sessionLogFileName } from '../src/export/session-log.ts'
import type { NativeConversationRow } from '../src/components/session-conversation-logic.ts'
import type { SessionHistoryItem, SessionHistoryPayload } from '../src/types/mobile.ts'

const header = { exportedAt: '2026/11/01 17:20', sessionId: 'ses_01', title: '样式对齐' }

describe('renderSessionLog', () => {
  it('opens with the session identity and one section per row', () => {
    const rows: NativeConversationRow[] = [
      { kind: 'user', text: '把手机端对齐到 web' },
      { kind: 'assistant', text: '先量一遍 web 的字号。' },
    ]
    const markdown = renderSessionLog(rows, header)
    expect(markdown.startsWith('# 样式对齐\n')).toBe(true)
    expect(markdown).toContain('- 会话 ID：ses_01')
    expect(markdown).toContain('- 导出时间：2026/11/01 17:20')
    expect(markdown).toContain('### 用户\n\n把手机端对齐到 web')
    expect(markdown).toContain('### 助手\n\n先量一遍 web 的字号。')
    expect(markdown.endsWith('\n')).toBe(true)
  })

  it('keeps Think in a collapsed block so prose stays the readable outline', () => {
    const markdown = renderSessionLog([{ kind: 'reasoning', text: '先看 design-platform.css。' }], header)
    expect(markdown).toContain('<summary>思考过程</summary>')
    expect(markdown).toContain('先看 design-platform.css。')
  })

  it('names a tool call with its name, state, argument, and result', () => {
    const markdown = renderSessionLog(
      [
        {
          kind: 'tool',
          output: 'BUILD SUCCESSFUL',
          state: 'completed',
          toolInput: '{"command":"./gradlew assembleRelease"}',
          toolName: 'bash',
        },
      ],
      header,
    )
    expect(markdown).toContain('### 工具 · bash')
    expect(markdown).toContain('- 状态：已完成')
    expect(markdown).toContain('**输入**')
    expect(markdown).toContain('{"command":"./gradlew assembleRelease"}')
    expect(markdown).toContain('**输出**')
    expect(markdown).toContain('BUILD SUCCESSFUL')
  })

  it('opens a longer fence when the payload already carries one', () => {
    const markdown = renderSessionLog(
      [
        {
          kind: 'tool',
          output: '```ts\nconst a = 1\n```',
          state: 'completed',
          toolName: 'read',
        },
      ],
      header,
    )
    expect(markdown).toContain('````\n```ts\nconst a = 1\n```\n````')
  })

  it('omits a field rather than writing an empty block', () => {
    const markdown = renderSessionLog([{ kind: 'tool', state: 'running', toolName: 'bash' }], header)
    expect(markdown).toContain('- 状态：运行中')
    expect(markdown).not.toContain('**输入**')
    expect(markdown).not.toContain('**输出**')
  })

  it('carries retry, turn error, token cut-off, and compaction into the file', () => {
    const rows: NativeConversationRow[] = [
      { delayMs: 2_000, failureMessage: 'rate limited', kind: 'retry', maxRetries: 3, retry: 1 },
      { kind: 'turn-error', message: 'upstream 502' },
      { kind: 'turn-max-tokens' },
      { kind: 'compaction', shadowedItemCount: 42, shadowedTokenCount: 8_000, summary: '把前半段压成摘要。' },
    ]
    const markdown = renderSessionLog(rows, header)
    expect(markdown).toContain('### 重试')
    expect(markdown).toContain('第 1/3 次重试，等待 2000 毫秒；失败原因：rate limited')
    expect(markdown).toContain('### 回合错误')
    expect(markdown).toContain('upstream 502')
    expect(markdown).toContain('### 回合中断')
    expect(markdown).toContain('### 上下文压缩')
    expect(markdown).toContain('压缩了 42 条记录、8000 个 token。')
    expect(markdown).toContain('把前半段压成摘要。')
  })

  it('writes a heading without a body when a row carries no text', () => {
    const markdown = renderSessionLog([{ kind: 'assistant', text: '   ' }], header)
    expect(markdown).toContain('### 助手')
    expect(markdown.trimEnd().endsWith('### 助手')).toBe(true)
  })

  it('warns in the header when paging gave up before the first event', () => {
    const markdown = renderSessionLog([{ kind: 'user', text: 'hi' }], { ...header, truncated: true })
    expect(markdown).toContain('> 本文件只包含最近的记录，更早的部分未能取回。')
  })

  it('falls back to a heading when the session has no title', () => {
    const markdown = renderSessionLog([], { ...header, title: '   ' })
    expect(markdown.startsWith('# 助手\n')).toBe(true)
  })
})

describe('sessionLogFileName', () => {
  it('keeps the durable id and drops separators', () => {
    expect(sessionLogFileName('ses_01')).toBe('dsh-session-ses_01.md')
    expect(sessionLogFileName('a/b c')).toBe('dsh-session-a-b-c.md')
    expect(sessionLogFileName('///')).toBe('dsh-session-log.md')
  })
})

describe('collectSessionHistory', () => {
  const item = (seq: number): SessionHistoryItem => ({ event: { type: 'turn/start' }, seq })

  it('returns the newest page when the log has no older events', async () => {
    const collected = await collectSessionHistory(async () => ({ items: [item(1), item(2)] }))
    expect(collected.items.map((entry) => entry.seq)).toEqual([1, 2])
    expect(collected.pages).toBe(1)
    expect(collected.truncated).toBe(false)
  })

  it('walks backwards and returns the log oldest first', async () => {
    const pages: Record<string, SessionHistoryPayload> = {
      tail: { hasMore: true, items: [item(5), item(6)] },
      '5': { hasMore: true, items: [item(3), item(4)] },
      '3': { hasMore: false, items: [item(1), item(2)] },
    }
    const asked: Array<number | undefined> = []
    const collected = await collectSessionHistory(async (beforeSeq) => {
      asked.push(beforeSeq)
      return pages[beforeSeq === undefined ? 'tail' : String(beforeSeq)]
    })
    expect(asked).toEqual([undefined, 5, 3])
    expect(collected.items.map((entry) => entry.seq)).toEqual([1, 2, 3, 4, 5, 6])
    expect(collected.pages).toBe(3)
    expect(collected.truncated).toBe(false)
  })

  it('stops when a page repeats the window it was asked from, and says so', async () => {
    const collected = await collectSessionHistory(async () => ({ hasMore: true, items: [item(7), item(8)] }))
    expect(collected.items.map((entry) => entry.seq)).toEqual([7, 8])
    expect(collected.pages).toBe(1)
    expect(collected.truncated).toBe(true)
  })

  it('drops a sequence number it already holds', async () => {
    const collected = await collectSessionHistory(async () => ({ items: [item(1), item(1), item(2)] }))
    expect(collected.items.map((entry) => entry.seq)).toEqual([1, 2])
  })

  it('reports a truncated log when the page budget runs out', async () => {
    const collected = await collectSessionHistory(
      async (beforeSeq) => ({
        hasMore: true,
        items: beforeSeq === undefined ? [item(9)] : [item(beforeSeq - 1)],
      }),
      { maxPages: 2 },
    )
    expect(collected.pages).toBe(2)
    expect(collected.truncated).toBe(true)
  })

  it('stops on an empty older page instead of asking again', async () => {
    const asked: Array<number | undefined> = []
    const collected = await collectSessionHistory(async (beforeSeq) => {
      asked.push(beforeSeq)
      return beforeSeq === undefined ? { hasMore: true, items: [item(4)] } : { hasMore: true, items: [] }
    })
    expect(asked).toEqual([undefined, 4])
    expect(collected.items.map((entry) => entry.seq)).toEqual([4])
  })
})
