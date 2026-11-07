import { describe, expect, it } from 'vitest'
import {
  awaySummary,
  completionBody,
  shouldBadgeCompletion,
  shouldPresentCompletion,
} from '../src/components/completion-notice-logic.ts'

describe('completion notices', () => {
  it('speaks only for a turn the reader is not already looking at', () => {
    expect(shouldPresentCompletion({ active: true, focused: false, granted: true })).toBe(true)
    expect(shouldPresentCompletion({ active: true, focused: true, granted: true })).toBe(false)
    expect(shouldPresentCompletion({ active: false, focused: false, granted: true })).toBe(false)
    expect(shouldPresentCompletion({ active: true, focused: false, granted: false })).toBe(false)
  })

  it('badges whenever no visible transcript already shows the result', () => {
    expect(shouldBadgeCompletion({ active: false, focused: false })).toBe(true)
    expect(shouldBadgeCompletion({ active: true, focused: false })).toBe(true)
    expect(shouldBadgeCompletion({ active: true, focused: true })).toBe(false)
  })

  it('names the finished session, and falls back when the list has no title yet', () => {
    expect(completionBody('修复登录')).toBe('修复登录 已完成')
    expect(completionBody(undefined)).toBe('有一个会话已完成')
    expect(completionBody('   ')).toBe('有一个会话已完成')
  })

  it('counts the sessions that finished while the app was away', () => {
    expect(awaySummary(1)).toBe('你离开期间，1 个会话完成了')
    expect(awaySummary(3)).toBe('你离开期间，3 个会话完成了')
  })
})
