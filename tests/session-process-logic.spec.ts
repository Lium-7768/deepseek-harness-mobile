import { describe, expect, it } from 'vitest'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { groupProcessRows, processActivity, processTitle } from '@/components/session-process-logic'

const reasoning = (text: string): NativeConversationRow => ({ kind: 'reasoning', text })
const tool = (toolName: string): NativeConversationRow => ({ kind: 'tool', toolName, state: 'completed' })
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

  it('summarises a settled step by its distinct activities', () => {
    expect(processTitle([reasoning('a')])).toBe('已完成分析')
    // Two activities read as one clause, as the desktop prints them.
    expect(processTitle([reasoning('a'), tool('bash')])).toBe('已完成分析并执行了命令')
    // A repeated activity does not appear twice in the summary.
    expect(processTitle([tool('bash'), tool('bash')])).toBe('执行了命令')
  })

  it('drops a prefix both activities share and lists three or more with commas', () => {
    expect(processTitle([reasoning('a'), tool('read_file')])).toBe('已完成分析并读取文件')
    // A shared prefix is only lifted for the two-activity clause.
    expect(processTitle([reasoning('a'), tool('read_file'), tool('bash')])).toBe('已完成分析，已读取文件，执行了命令')
    expect(processTitle([reasoning('a'), tool('read_file'), tool('bash'), tool('web_search')])).toBe(
      '已完成分析，已读取文件，执行了命令等',
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

  it('shows the live activity while the newest step is running', () => {
    const rows = [user('hi'), reasoning('a'), tool('bash')]
    const display = groupProcessRows(rows, { running: true })
    const group = display[1]
    expect(group.kind === 'process' && group.title).toBe('正在运行命令')
    expect(group.kind === 'process' && group.running).toBe(true)
  })
})
