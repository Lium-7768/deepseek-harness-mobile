import { describe, expect, it } from 'vitest'
import { formatMessageTime, messageActionLayout } from '../src/components/session-message-logic'

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
