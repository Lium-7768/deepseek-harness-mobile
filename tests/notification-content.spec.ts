import { describe, expect, it } from 'vitest'
import {
  awaySummary,
  noticeContent,
  noticeIdentifier,
  shouldNotice,
  type NoticeKind,
} from '../src/components/notification-content.ts'

const KINDS: NoticeKind[] = ['ask', 'approve', 'done', 'failed', 'plan']

describe('notice content', () => {
  it('names the conversation in the headline, so a banner says which turn it is about', () => {
    expect(noticeContent('done', 's-1', '修复登录').title).toBe('修复登录')
  })

  it('falls back to the product name when the list has not named the conversation yet', () => {
    expect(noticeContent('done', 's-1', undefined).title).toBe('DeepSeek Harness')
    expect(noticeContent('done', 's-1', '   ').title).toBe('DeepSeek Harness')
  })

  it('states what the conversation now wants, one line per kind', () => {
    const subtitles = KINDS.map((kind) => noticeContent(kind, 's-1', '任务').subtitle)
    expect(new Set(subtitles).size).toBe(KINDS.length)
    expect(noticeContent('ask', 's-1', '任务').subtitle).toBe('等你回答')
    expect(noticeContent('done', 's-1', '任务').subtitle).toBe('已完成')
  })

  it('carries the question itself, because that line is what decides whether to come back', () => {
    expect(noticeContent('ask', 's-1', '任务', '要保留旧配置吗？').body).toBe('要保留旧配置吗？')
    expect(noticeContent('ask', 's-1', '任务').body).toBe('有一个问题等你回答')
    expect(noticeContent('ask', 's-1', '任务', '  ').body).toBe('有一个问题等你回答')
  })

  it('names the tool an approval is waiting on', () => {
    expect(noticeContent('approve', 's-1', '任务', 'shell').body).toBe('需要允许 shell')
    expect(noticeContent('approve', 's-1', '任务').body).toBe('有一个操作等你确认')
  })

  it('shows the failure message when the turn reported one', () => {
    expect(noticeContent('failed', 's-1', '任务', '模型超时').body).toBe('模型超时')
    expect(noticeContent('failed', 's-1', '任务').body).toBe('本轮没能完成，点按查看')
  })

  it('gives each kind its own tone, matching the desktop sound notifier', () => {
    const sound = (kind: NoticeKind): string => noticeContent(kind, 's-1', '任务').sound
    expect(sound('done')).toBe('done.wav')
    expect(sound('ask')).toBe('ask.wav')
    expect(sound('approve')).toBe('ask.wav')
    expect(sound('failed')).toBe('fail.wav')
    expect(sound('plan')).toBe('plan.wav')
  })

  it('points the response handler at the conversation it describes', () => {
    const content = noticeContent('ask', 's-42', '任务')
    expect(content.data).toEqual({ sessionId: 's-42', kind: 'ask' })
    expect(content.threadIdentifier).toBe('s-42')
    expect(content.categoryIdentifier).toBe('completion-ask')
  })

  it('posts one conversation and one state under one identifier, so a repeat replaces it', () => {
    expect(noticeIdentifier('s-1', 'ask')).toBe('completion:s-1:ask')
    expect(noticeIdentifier('s-1', 'ask')).toBe(noticeIdentifier('s-1', 'ask'))
    expect(noticeIdentifier('s-1', 'ask')).not.toBe(noticeIdentifier('s-2', 'ask'))
    expect(noticeIdentifier('s-1', 'ask')).not.toBe(noticeIdentifier('s-1', 'done'))
  })
})

describe('when a notice is worth the interruption', () => {
  it('stays silent without permission', () => {
    for (const kind of KINDS) expect(shouldNotice({ kind, focused: false, granted: false })).toBe(false)
  })

  it('speaks for every kind once the reader has left the conversation', () => {
    for (const kind of KINDS) expect(shouldNotice({ kind, focused: false, granted: true })).toBe(true)
  })

  it('stays silent on the conversation already on screen, except when the turn is blocked on the reader', () => {
    expect(shouldNotice({ kind: 'done', focused: true, granted: true })).toBe(false)
    expect(shouldNotice({ kind: 'failed', focused: true, granted: true })).toBe(false)
    expect(shouldNotice({ kind: 'plan', focused: true, granted: true })).toBe(false)
    expect(shouldNotice({ kind: 'ask', focused: true, granted: true })).toBe(true)
    expect(shouldNotice({ kind: 'approve', focused: true, granted: true })).toBe(true)
  })
})

describe('the summary shown on return', () => {
  it('counts the conversations that finished while the app was away', () => {
    expect(awaySummary(1)).toBe('你离开期间，1 个会话完成了')
    expect(awaySummary(3)).toBe('你离开期间，3 个会话完成了')
  })
})
