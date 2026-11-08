import { describe, expect, it } from 'vitest'
import { timingOf } from '@/components/schedule-editor-logic'

describe('automation timing rules', () => {
  it('writes a daily rule in the device zone', () => {
    expect(timingOf({ hours: '', kind: 'daily', minutes: '', time: '9:05', timeZone: 'Asia/Shanghai' })).toEqual({
      daily: { time: '09:05:00', time_zone: 'Asia/Shanghai' },
      kind: 'daily',
    })
  })

  it('converts hours and minutes into the Host seconds fields', () => {
    expect(timingOf({ hours: '6', kind: 'every', minutes: '', time: '', timeZone: 'UTC' })).toEqual({
      every_seconds: 21_600,
      kind: 'every',
    })
    expect(timingOf({ hours: '', kind: 'after', minutes: '90', time: '', timeZone: 'UTC' })).toEqual({
      after_seconds: 5_400,
      kind: 'after',
    })
  })

  it('refuses a malformed time or a non-positive interval', () => {
    expect(timingOf({ hours: '', kind: 'daily', minutes: '', time: '25:00', timeZone: 'UTC' })).toBeUndefined()
    expect(timingOf({ hours: '', kind: 'daily', minutes: '', time: '09', timeZone: 'UTC' })).toBeUndefined()
    expect(timingOf({ hours: '0', kind: 'every', minutes: '', time: '', timeZone: 'UTC' })).toBeUndefined()
  })
})
