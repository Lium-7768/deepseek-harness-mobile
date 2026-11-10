import { describe, expect, it } from 'vitest'
import { timingOf, type TimingForm } from '@/components/schedule-editor-logic'

/** A blank form; each case overrides the fields its timing kind reads. */
const EMPTY: TimingForm = {
  cron: '',
  date: '',
  hours: '',
  kind: 'daily',
  minutes: '',
  rrule: '',
  time: '',
  timeZone: 'UTC',
  weekdays: [],
}

describe('automation timing rules', () => {
  it('writes a daily rule in the device zone', () => {
    expect(timingOf({ ...EMPTY, kind: 'daily', time: '9:05', timeZone: 'Asia/Shanghai' })).toEqual({
      daily: { time: '09:05:00', time_zone: 'Asia/Shanghai' },
      kind: 'daily',
    })
  })

  it('converts hours and minutes into the Host seconds fields', () => {
    expect(timingOf({ ...EMPTY, hours: '6', kind: 'every', timeZone: 'UTC' })).toEqual({
      every_seconds: 21_600,
      kind: 'every',
    })
    expect(timingOf({ ...EMPTY, kind: 'after', minutes: '90', timeZone: 'UTC' })).toEqual({
      after_seconds: 5_400,
      kind: 'after',
    })
  })

  it('refuses a malformed time or a non-positive interval', () => {
    expect(timingOf({ ...EMPTY, kind: 'daily', time: '25:00', timeZone: 'UTC' })).toBeUndefined()
    expect(timingOf({ hours: '', kind: 'daily', minutes: '', time: '09', timeZone: 'UTC' })).toBeUndefined()
    expect(timingOf({ hours: '0', kind: 'every', minutes: '', time: '', timeZone: 'UTC' })).toBeUndefined()
  })
})

describe('the rest of the host timing union', () => {
  it('writes a weekly rule with sorted, de-duplicated ISO weekdays', () => {
    expect(
      timingOf({ ...EMPTY, kind: 'weekly', time: '09:30', timeZone: 'Asia/Shanghai', weekdays: [3, 1, 3] }),
    ).toEqual({ kind: 'weekly', weekly: { time: '09:30:00', time_zone: 'Asia/Shanghai', weekdays: [1, 3] } })
  })

  it('rejects a weekly rule with no weekday, as the host does', () => {
    expect(timingOf({ ...EMPTY, kind: 'weekly', time: '09:30', weekdays: [] })).toBeUndefined()
  })

  it('writes an absolute instant from a calendar date and a clock', () => {
    expect(timingOf({ ...EMPTY, date: '2026-11-11', kind: 'at', time: '09:30', timeZone: 'Asia/Shanghai' })).toEqual({
      at: { date: '2026-11-11', time: '09:30:00', time_zone: 'Asia/Shanghai' },
      kind: 'at',
    })
    expect(timingOf({ ...EMPTY, date: '11/11/2026', kind: 'at', time: '09:30' })).toBeUndefined()
  })

  it('forwards a five-field cron expression and rejects a shorter one', () => {
    expect(timingOf({ ...EMPTY, cron: '0  9 * *  1-5', kind: 'cron', timeZone: 'Asia/Shanghai' })).toEqual({
      cron: { expression: '0 9 * * 1-5', time_zone: 'Asia/Shanghai' },
      kind: 'cron',
    })
    expect(timingOf({ ...EMPTY, cron: '0 9 * *', kind: 'cron' })).toBeUndefined()
  })

  it('forwards rrule text and refuses nothing but an empty rule', () => {
    // The host parses the rule and reports its own structured error, so the form keeps
    // out of the way beyond refusing an empty field.
    expect(timingOf({ ...EMPTY, kind: 'rrule', rrule: 'FREQ=WEEKLY;BYDAY=MO' })).toEqual({
      kind: 'rrule',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
    })
    expect(timingOf({ ...EMPTY, kind: 'rrule', rrule: '   ' })).toBeUndefined()
  })
})
