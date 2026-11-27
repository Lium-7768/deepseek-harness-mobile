import { describe, expect, it } from 'vitest'
import { presentationPolicyFor } from '@/components/chat-presentation-policy'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { groupProcessRows, processActivity, processTitle } from '@/components/session-process-logic'

const reasoning = (text: string, running?: boolean): NativeConversationRow => ({
  kind: 'reasoning',
  text,
  ...(running ? { running: true } : {}),
})
const tool = (
  toolName: string,
  state: 'completed' | 'failed' | 'running' = 'completed',
  extra: { summary?: string; toolInput?: string } = {},
): NativeConversationRow => ({ kind: 'tool', toolName, state, ...extra })
const context = (producer: string): NativeConversationRow => ({ kind: 'context', producer, text: 'ctx' })
const user = (text: string): NativeConversationRow => ({ kind: 'user', text })
const assistant = (text: string): NativeConversationRow => ({ kind: 'assistant', text })

describe('process activity naming', () => {
  it('names a reasoning row as thinking and a shell call as commands', () => {
    expect(processActivity(reasoning('x'))).toBe('thinking')
    expect(processActivity(tool('bash'))).toBe('commands')
    expect(processActivity(tool('read_image'))).toBe('readImage')
    expect(processActivity(tool('web_search'))).toBe('webSearch')
    expect(processActivity(tool('read_file'))).toBe('read')
  })

  it('summarises a settled step by ranked tool counts, falling back to thinking or context-only', () => {
    expect(processTitle([reasoning('a')])).toBe('已完成分析')
    // Matches desktop process-activity: reasoning does not count beside tool calls.
    expect(processTitle([reasoning('a'), tool('bash')])).toBe('执行了命令')
    // A repeated activity does not appear twice in the summary.
    expect(processTitle([tool('bash'), tool('bash')])).toBe('执行了命令')
    // More frequent activities rank ahead of less frequent ones.
    expect(processTitle([tool('read_file'), tool('bash'), tool('bash')])).toBe('执行了命令并已读取文件')
    // Context-only steps report context; mixed context adds no count beside tools.
    expect(processTitle([context('skill-catalog')])).toBe('已注入上下文')
    expect(processTitle([context('skill-catalog'), tool('bash')])).toBe('执行了命令')
  })

  it('drops a shared prefix for two activities and lists three or more with commas', () => {
    expect(processTitle([tool('read_file'), tool('web_search')])).toBe('已读取文件并搜索网页')
    // A shared prefix is only lifted for the two-activity clause.
    expect(processTitle([tool('read_file'), tool('web_search'), tool('bash')])).toBe(
      '已读取文件，已搜索网页，执行了命令',
    )
    expect(processTitle([tool('read_file'), tool('web_search'), tool('bash'), tool('write')])).toBe(
      '已读取文件，已搜索网页，执行了命令等',
    )
  })
})

describe('process grouping', () => {
  it('collapses a run of reasoning and tool rows into one header', () => {
    const rows = [user('hi'), reasoning('plan'), tool('bash'), tool('read_file'), assistant('done')]
    const display = groupProcessRows(rows, { running: false })
    expect(display.map((row) => row.kind)).toEqual(['user', 'process', 'assistant'])
    const group = display[1]
    expect(group.kind === 'process' && group.rows).toHaveLength(3)
  })

  it('never groups rows across an assistant answer', () => {
    const rows = [reasoning('a'), assistant('answer'), reasoning('b')]
    const display = groupProcessRows(rows, { running: false })
    // Two separate steps: the answer breaks the run, so each side is its own group.
    expect(display.map((row) => row.kind)).toEqual(['process', 'assistant', 'process'])
    expect(display[0].kind === 'process' && display[0].rows).toHaveLength(1)
    expect(display[2].kind === 'process' && display[2].rows).toHaveLength(1)
  })

  it('shows the live activity for an active tool and falls back to thinking once tools settle', () => {
    const runningRows = [user('hi'), reasoning('a'), tool('bash', 'running', { summary: 'pnpm test' })]
    const runningDisplay = groupProcessRows(runningRows, {
      policy: presentationPolicyFor('standard'),
      running: true,
    })
    const runningGroup = runningDisplay[1]
    expect(runningGroup.kind === 'process' && runningGroup.title).toBe('正在运行命令 · pnpm test')
    expect(runningGroup.kind === 'process' && runningGroup.running).toBe(true)

    const settledToolRows = [user('hi'), reasoning('a'), tool('bash', 'completed')]
    const settledDisplay = groupProcessRows(settledToolRows, { running: true })
    const settledGroup = settledDisplay[1]
    expect(settledGroup.kind === 'process' && settledGroup.title).toBe('正在分析请求')
    expect(settledGroup.kind === 'process' && settledGroup.running).toBe(true)
  })

  it('renders live turns flat under detailed mode and all groups flat under verbose mode', () => {
    const rows = [user('hi'), reasoning('plan'), tool('bash', 'running')]
    const detailed = groupProcessRows(rows, { policy: presentationPolicyFor('detailed'), running: true })
    expect(detailed[1]?.kind === 'process' && detailed[1].flat).toBe(true)

    const verbose = groupProcessRows(rows, { policy: presentationPolicyFor('verbose'), running: false })
    expect(verbose[1]?.kind === 'process' && verbose[1].flat).toBe(true)
  })
})

describe('step labels inside a live turn', () => {
  it('names the finished groups as done and only the tail group as running', () => {
    const rows = [
      { kind: 'tool' as const, state: 'completed' as const, toolName: 'bash', sourceSeq: 1 },
      { kind: 'assistant' as const, text: '中间说明', sourceSeq: 2 },
      { kind: 'tool' as const, state: 'running' as const, toolName: 'bash', sourceSeq: 3 },
    ]
    const display = groupProcessRows(rows, { liveTurnStartSeq: 1, running: true })
    const groups = display.filter((row) => row.kind === 'process')
    expect(groups).toHaveLength(2)
    expect(groups[0]?.running).toBe(false)
    expect(groups[0]?.title).toBe('执行了命令')
    expect(groups[1]?.running).toBe(true)
  })

  it('does not mark a settled previous Turn trailing step group as live when a new Turn starts', () => {
    const rows: NativeConversationRow[] = [{ kind: 'tool', state: 'completed', toolName: 'bash', sourceSeq: 3 }]
    const display = groupProcessRows(rows, {
      running: true,
      liveTurnStartSeq: 10,
      spans: [
        { turn: 1, startSeq: 1, endSeq: 5, failed: false, stopped: false },
        { turn: 2, startSeq: 10, endSeq: Number.MAX_SAFE_INTEGER, failed: false, stopped: false },
      ],
    })
    expect(display[0]?.kind === 'process' && display[0].running).toBe(false)
    expect(display[0]?.kind === 'process' && display[0].title).toBe('执行了命令')
  })

  it('shows live reasoning detail only while that reasoning block is running', () => {
    const activeRows: NativeConversationRow[] = [reasoning('检查构建输出\n\n下一段', true)]
    const active = groupProcessRows(activeRows, {
      policy: presentationPolicyFor('standard'),
      running: true,
    })
    expect(active[0]?.kind === 'process' && active[0].title).toBe('正在分析请求 · 下一段')

    const settledRows: NativeConversationRow[] = [reasoning('旧的思考内容', false), tool('bash', 'completed')]
    const settled = groupProcessRows(settledRows, {
      policy: presentationPolicyFor('standard'),
      running: true,
    })
    expect(settled[0]?.kind === 'process' && settled[0].title).toBe('正在分析请求')
  })

  it('uses desktop prepare labels while a tool call is still streaming arguments', () => {
    const preparingRows: NativeConversationRow[] = [
      {
        kind: 'tool',
        callId: 'c1',
        preparing: true,
        state: 'running',
        toolName: 'bash',
        toolInput: '{"command":"pnpm test"}',
      },
    ]
    const display = groupProcessRows(preparingRows, {
      policy: presentationPolicyFor('standard'),
      running: true,
    })
    expect(display[0]?.kind === 'process' && display[0].title).toBe('准备运行命令 · pnpm test')
  })
})
