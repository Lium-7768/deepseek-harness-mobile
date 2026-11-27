import { describe, expect, it } from 'vitest'
import { presentationPolicyFor } from '@/components/chat-presentation-policy'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import type { NativeDisplayRow, NativeProcessRow } from '@/components/session-process-logic'
import {
  foldCompletedTurns,
  formatTurnDuration,
  turnSpans,
  turnTitle,
  type TurnSpan,
} from '@/components/session-turn-logic'
import type { SharedEventItem } from '@/shared/dsh-presentation'

const step = (rowKey: string, sourceSeq: number): NativeProcessRow => ({
  activity: 'commands',
  activities: ['commands'],
  kind: 'process',
  rowKey,
  rows: [],
  running: false,
  sourceSeq,
  title: '执行了命令',
})
const assistant = (sourceSeq: number, text = '答'): NativeConversationRow => ({ kind: 'assistant', sourceSeq, text })
const user = (sourceSeq: number): NativeConversationRow => ({ kind: 'user', sourceSeq, text: '问' })
const retry = (sourceSeq: number): NativeConversationRow => ({
  delayMs: 1_000,
  failureMessage: 'x',
  kind: 'retry',
  maxRetries: 5,
  retry: 1,
  sourceSeq,
})
const command = (sourceSeq: number): NativeConversationRow => ({
  kind: 'command',
  name: 'build',
  sourceSeq,
  state: 'success',
})
const span = (turn: number, startSeq: number, endSeq: number, overrides: Partial<TurnSpan> = {}): TurnSpan => ({
  endSeq,
  failed: false,
  startSeq,
  stopped: false,
  turn,
  ...overrides,
})

describe('turn duration', () => {
  it('prints seconds, minutes, and hours the way the desktop does', () => {
    expect(formatTurnDuration(4_900)).toBe('4秒')
    expect(formatTurnDuration(5_000)).toBe('5秒')
    expect(formatTurnDuration(120_000)).toBe('2分0秒')
    expect(formatTurnDuration(688_000)).toBe('11分28秒')
    expect(formatTurnDuration(3_903_000)).toBe('1小时5分3秒')
  })

  it('names the control from the Turn outcome', () => {
    expect(turnTitle(span(1, 1, 9, { durationMs: 420 }))).toBe('已完成，用时 1秒')
    expect(turnTitle(span(1, 1, 9, { durationMs: 5_000 }))).toBe('已完成，用时 5秒')
    expect(turnTitle(span(1, 1, 9))).toBe('已完成')
    expect(turnTitle(span(1, 1, 9, { durationMs: 5_000, failed: true }))).toBe('处理失败')
    expect(turnTitle(span(1, 1, 9, { durationMs: 5_000, stopped: true }))).toBe('已停止')
  })
})

describe('turn spans', () => {
  it('reads the span, outcome, and duration of every durable Turn', () => {
    const items: SharedEventItem[] = [
      { seq: 1, event: { type: 'turn/start', data: { turn: 1 }, time: 1_000 } },
      { seq: 5, event: { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } }, time: 6_000 } },
      { seq: 7, event: { type: 'turn/start', data: { turn: 2 }, time: 8_000 } },
      { seq: 9, event: { type: 'turn/end', data: { turn: 2, reason: { kind: 'aborted' } }, time: 9_500 } },
    ] as SharedEventItem[]
    const spans = turnSpans(items)
    expect(
      spans.map(({ turn, startSeq, endSeq, durationMs, stopped }) => ({ turn, startSeq, endSeq, durationMs, stopped })),
    ).toEqual([
      { turn: 1, startSeq: 1, endSeq: 5, durationMs: 5_000, stopped: false },
      { turn: 2, startSeq: 7, endSeq: 9, durationMs: 1_500, stopped: true },
    ])
  })
})

describe('whole-Turn folding', () => {
  const spans = [span(1, 2, 20, { durationMs: 5_000 })]

  it('folds every step of one Turn behind one control while keeping chronological order around mid-turn replies', () => {
    const rows: NativeDisplayRow[] = [
      user(1),
      step('process:3', 3),
      assistant(5, '第一步'),
      retry(7),
      command(9),
      step('process:11', 11),
      assistant(15, '答案'),
    ]
    const folded = foldCompletedTurns(rows, { spans })
    expect(folded.map((row) => row.kind)).toEqual(['user', 'turn', 'assistant', 'turn', 'assistant'])
    const head = folded[1]
    const cont = folded[3]
    expect(head?.kind === 'turn' && head.title).toBe('已完成，用时 5秒')
    expect(head?.kind === 'turn' && head.continuation).toBeUndefined()
    expect(head?.kind === 'turn' && head.rows.map((row) => row.kind)).toEqual(['process'])
    expect(cont?.kind === 'turn' && cont.continuation).toBe(true)
    expect(cont?.kind === 'turn' && cont.controlKey).toBe('turn:1')
    expect(cont?.kind === 'turn' && cont.rows.map((row) => row.kind)).toEqual(['retry', 'command', 'process'])
    expect(head?.kind === 'turn' && head.descendantKeys).toContain('process:3')
    expect(head?.kind === 'turn' && head.descendantKeys).toContain('process:11')
  })

  it('leaves an open Turn with its live steps and folds the Turn before it', () => {
    const open = [span(1, 2, 20, { durationMs: 5_000 }), span(2, 22, Number.MAX_SAFE_INTEGER)]
    const rows: NativeDisplayRow[] = [
      user(1),
      step('process:3', 3),
      assistant(15),
      user(21),
      step('process:23', 23),
      assistant(25),
    ]
    const folded = foldCompletedTurns(rows, { spans: open })
    expect(folded.map((row) => row.kind)).toEqual(['user', 'turn', 'assistant', 'user', 'process', 'assistant'])
    expect(folded[4]?.kind === 'process' && folded[4].rowKey).toBe('process:23')
  })

  it('keeps a failed Turn open and its control inert', () => {
    const rows: NativeDisplayRow[] = [user(1), step('process:3', 3), assistant(15)]
    const folded = foldCompletedTurns(rows, { spans: [span(1, 2, 20, { failed: true })] })
    const turn = folded[1]
    expect(turn?.kind === 'turn' && turn.locked).toBe(true)
    expect(turn?.kind === 'turn' && turn.title).toBe('处理失败')
  })

  it('supports verbose mode, next-input collapse timing, final-only replies, and interleaved input locking', () => {
    const rows: NativeDisplayRow[] = [
      user(1),
      step('process:3', 3),
      assistant(5, '中间说明'),
      step('process:11', 11),
      assistant(15, '最终回答'),
    ]
    // verbose mode disables whole-Turn folding.
    const verbose = foldCompletedTurns(rows, { spans, policy: presentationPolicyFor('verbose') })
    expect(verbose.map((row) => row.kind)).toEqual(['user', 'process', 'assistant', 'process', 'assistant'])

    // next-input keeps the latest completed Turn control visible and open by default until a later user message arrives.
    const deferred = foldCompletedTurns(rows, { spans, policy: presentationPolicyFor('detailed', 'next-input') })
    expect(deferred.map((row) => row.kind)).toEqual(['user', 'turn', 'assistant', 'turn', 'assistant'])
    expect(deferred[1]?.kind === 'turn' && deferred[1].defaultOpen).toBe(true)
    expect(deferred[3]?.kind === 'turn' && deferred[3].defaultOpen).toBe(true)
    const afterNextInput = foldCompletedTurns([...rows, user(25)], {
      spans,
      policy: presentationPolicyFor('detailed', 'next-input'),
    })
    expect(afterNextInput.map((row) => row.kind)).toEqual(['user', 'turn', 'assistant', 'turn', 'assistant', 'user'])
    expect(afterNextInput[1]?.kind === 'turn' && afterNextInput[1].defaultOpen).toBeUndefined()

    // foldedReplies: 'final' absorbs intermediate assistant replies into the Turn fold.
    const finalOnly = foldCompletedTurns(rows, {
      spans,
      policy: presentationPolicyFor('detailed', 'completion', 'final'),
    })
    expect(finalOnly.map((row) => row.kind)).toEqual(['user', 'turn', 'assistant'])
    expect(finalOnly[1]?.kind === 'turn' && finalOnly[1].rows.map((row) => row.kind)).toEqual([
      'process',
      'assistant',
      'process',
    ])

    // Interleaved user input admitted inside a Turn locks the Turn open.
    const interleaved = foldCompletedTurns([user(1), step('process:3', 3), user(8), assistant(15)], { spans })
    expect(interleaved[1]?.kind === 'turn' && interleaved[1].locked).toBe(true)
  })

  it('leaves rows outside any settled Turn alone', () => {
    const rows: NativeDisplayRow[] = [step('process:1', 1), assistant(2)]
    expect(foldCompletedTurns(rows, { spans: [span(1, 10, 20)] }).map((row) => row.kind)).toEqual([
      'process',
      'assistant',
    ])
  })

  it('folds a partial historical Turn whose turn/start fell outside the loaded window', () => {
    const items: SharedEventItem[] = [
      { seq: 50, event: { type: 'tool/call', data: { turn: 7, callId: 't1', name: 'read' } } },
      {
        seq: 52,
        event: { type: 'assistant/message', data: { turn: 7, message: { content: [{ type: 'text', text: 'done' }] } } },
      },
      { seq: 53, event: { type: 'turn/end', data: { turn: 7, reason: { kind: 'completed' } }, time: 9_000 } },
    ] as SharedEventItem[]
    const partialSpans = turnSpans(items)
    expect(partialSpans).toEqual([{ turn: 7, startSeq: 50, endSeq: 53, failed: false, stopped: false }])
    const folded = foldCompletedTurns([step('process:50', 50), assistant(52, 'done')], { spans: partialSpans })
    expect(folded.map((row) => row.kind)).toEqual(['turn', 'assistant'])
  })
})
