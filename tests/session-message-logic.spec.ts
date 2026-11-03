import { describe, expect, it } from 'vitest'
import { formatMessageTime, messageActionLayout } from '../src/components/session-message-logic'
import { projectNativeConversationRows } from '../src/components/session-conversation-logic'

describe('formatMessageTime', () => {
  it('renders the Web 24-hour zero-padded clock on the same calendar day', () => {
    const now = new Date(2026, 9, 28, 20, 0).getTime()
    expect(formatMessageTime(new Date(2026, 9, 28, 9, 24).getTime(), now)).toBe('09:24')
    expect(formatMessageTime(new Date(2026, 9, 28, 23, 36).getTime(), now)).toBe('23:36')
  })

  it('does not fall back to a locale clock that would read 9:24 PM', () => {
    const now = new Date(2026, 9, 28, 20, 0).getTime()
    expect(formatMessageTime(new Date(2026, 9, 28, 21, 24).getTime(), now)).not.toMatch(/[AP]M/)
  })

  it('prefixes the date once the message is not from today', () => {
    const now = new Date(2026, 9, 30, 12, 0).getTime()
    expect(formatMessageTime(new Date(2026, 9, 28, 21, 24).getTime(), now)).toBe('10月28日 21:24')
  })

  it('prefixes the year once the message is not from this year', () => {
    const now = new Date(2026, 0, 3, 12, 0).getTime()
    expect(formatMessageTime(new Date(2025, 11, 31, 8, 5).getTime(), now)).toBe('2025年12月31日 08:05')
  })

  it('keeps the same reading for the same instant', () => {
    const instant = new Date(2026, 9, 28, 9, 45).getTime()
    const now = new Date(2026, 9, 28, 20, 0).getTime()
    expect(formatMessageTime(instant, now)).toBe(formatMessageTime(instant, now))
  })
})

describe('messageActionLayout', () => {
  it('gives the copy control one 44pt tap target on both sides of the conversation', () => {
    expect(messageActionLayout('user')).toEqual({ alignSelf: 'flex-end', height: 28, width: 28 })
    expect(messageActionLayout('assistant')).toEqual({ alignSelf: 'flex-start', height: 28, width: 28 })
  })
})

describe('the action strip clock', () => {
  it('has a time to show on a projected user message', () => {
    const rows = projectNativeConversationRows([
      { seq: 1, event: { type: 'turn/start', time: 1_000, data: { turn: 1 } } },
      {
        seq: 2,
        event: { type: 'user/message', time: 1_100, data: { message: { content: [{ type: 'text', text: '继续' }] } } },
      },
    ] as never)
    const user = rows.find((row) => row.kind === 'user')
    expect(user).toBeDefined()
    expect(user !== undefined && 'time' in user ? user.time : undefined).toBe(1_100)
    expect(formatMessageTime(1_100, 1_100)).toMatch(/^\d{2}:\d{2}$/)
  })
})
