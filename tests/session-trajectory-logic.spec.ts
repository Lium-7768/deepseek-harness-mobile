import { describe, expect, it } from 'vitest'
import {
  formatTrajectoryDuration,
  projectNativeTrajectoryActivities,
} from '../src/components/session-trajectory-logic.ts'

describe('native trajectory activity projection', () => {
  it('lists operations only and merges a tool result with its call', () => {
    const activities = projectNativeTrajectoryActivities([
      { seq: 1, event: { type: 'turn/start', time: 1_000, data: { turn: 4 } } },
      {
        seq: 2,
        event: {
          type: 'user/message',
          data: { turn: 4, message: { content: [{ type: 'text', text: '请读取项目配置' }] } },
        },
      },
      {
        seq: 3,
        event: {
          type: 'tool/call',
          time: 2_000,
          data: { turn: 4, callId: 'call-1', name: 'read_file', description: '读取应用配置' },
        },
      },
      {
        seq: 4,
        event: {
          type: 'tool/result',
          time: 3_500,
          data: {
            turn: 4,
            message: {
              source: { callId: 'call-1' },
              content: [{ type: 'tool-result', content: [{ type: 'text', text: '已读取配置文件' }] }],
            },
          },
        },
      },
      {
        seq: 5,
        event: {
          type: 'assistant/message',
          data: {
            turn: 4,
            message: {
              content: [
                { type: 'reasoning', text: '先检查配置，再确认默认模型。' },
                { type: 'text', text: '配置读取完成。' },
              ],
            },
          },
        },
      },
      { seq: 6, event: { type: 'assistant/chunk', data: { turn: 4 } } },
      { seq: 7, event: { type: 'turn/end', data: { turn: 4 } } },
    ] as never)

    // The ledger lists operations only: the request, the reasoning, and the reply
    // belong to the chat tab, which already renders them.
    expect(activities).toEqual([
      expect.objectContaining({
        kind: 'tool',
        title: '读取文件',
        detail: '已读取配置文件',
        state: 'completed',
        turn: 4,
        durationMs: 1_500,
        showTurn: true,
      }),
    ])
    expect(activities.some((activity) => activity.title.includes('tool/call'))).toBe(false)
  })

  it('keeps an unfinished tool visible as a running user-facing operation', () => {
    const activities = projectNativeTrajectoryActivities([
      {
        seq: 8,
        event: {
          type: 'tool/call',
          data: { turn: 2, callId: 'call-2', name: 'bash', arguments: { command: 'git status' } },
        },
      },
    ] as never)

    expect(activities).toEqual([
      expect.objectContaining({
        kind: 'tool',
        title: '运行命令',
        detail: '正在运行命令。',
        state: 'running',
        turn: 2,
        showTurn: true,
      }),
    ])
  })

  it('drops machine JSON output instead of printing a summary line per call', () => {
    const activities = projectNativeTrajectoryActivities([
      {
        seq: 9,
        event: {
          type: 'tool/result',
          data: {
            turn: 3,
            message: {
              content: [
                { type: 'tool-result', content: [{ type: 'text', text: '{"status":"ok","trace":"internal"}' }] },
              ],
            },
          },
        },
      },
    ] as never)

    // A successful call with nothing readable adds no line: one boilerplate per
    // call buried the rows that actually carried a result.
    expect(activities).toEqual([expect.objectContaining({ kind: 'tool', title: '执行操作', state: 'completed' })])
    expect(activities[0]?.detail).toBeUndefined()
    // The complete output still travels, so the row can open it.
    expect(activities[0]?.raw).toBe('{"status":"ok","trace":"internal"}')
  })

  it('formats operation durations the way the Web trajectory prints them', () => {
    // Verified against `formatDurationMs`: milliseconds below a second, seconds
    // with two decimals below ten and one above.
    expect(formatTrajectoryDuration(0)).toBe('0 毫秒')
    expect(formatTrajectoryDuration(96)).toBe('96 毫秒')
    expect(formatTrajectoryDuration(1_500)).toBe('1.50 秒')
    expect(formatTrajectoryDuration(9_999)).toBe('10.00 秒')
    expect(formatTrajectoryDuration(79_000)).toBe('79.0 秒')
  })
})
