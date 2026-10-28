import { describe, expect, it } from 'vitest'
import { formatMessageTime, messageActionLayout } from '../src/components/session-message-logic'
import { projectNativeConversationRows } from '../src/components/session-conversation-logic'

describe('formatMessageTime', () => {
  it('renders a 24-hour clock rather than a locale default that may add seconds', () => {
    expect(formatMessageTime(Date.UTC(2026, 9, 28, 6, 5), 'en-GB')).toMatch(/^\d{2}:\d{2}$/)
  })

  it('distinguishes different times, so the label is not a constant', () => {
    const early = formatMessageTime(Date.UTC(2026, 9, 28, 1, 0), 'en-GB')
    const later = formatMessageTime(Date.UTC(2026, 9, 28, 2, 0), 'en-GB')
    expect(early).not.toBe(later)
  })

  it('keeps the same reading for the same instant', () => {
    const instant = Date.UTC(2026, 9, 28, 9, 45)
    expect(formatMessageTime(instant, 'en-GB')).toBe(formatMessageTime(instant, 'en-GB'))
  })
})

describe('messageActionLayout', () => {
  it('gives the copy control one 44pt tap target on both sides of the conversation', () => {
    expect(messageActionLayout('user')).toEqual({ alignSelf: 'flex-end', height: 44, width: 44 })
    expect(messageActionLayout('assistant')).toEqual({ alignSelf: 'flex-start', height: 44, width: 44 })
  })
})

describe('the action strip clock', () => {
  it('has a time to show on a projected user message', () => {
    const rows = projectNativeConversationRows([
      { seq: 1, event: { type: 'turn/start', time: 1_000, data: { turn: 1 } } },
      { seq: 2, event: { type: 'user/message', time: 1_100, data: { message: { content: [{ type: 'text', text: '继续' }] } } } },
    ] as never)
    const user = rows.find(row => row.kind === 'user')
    expect(user).toBeDefined()
    expect(user !== undefined && 'time' in user ? user.time : undefined).toBe(1_100)
    expect(formatMessageTime(1_100, 'en-GB')).toMatch(/^\d{2}:\d{2}$/)
  })
})
