import { describe, expect, it } from 'vitest'
import {
  SCHEDULE_RECOMMENDATIONS,
  filterSchedules,
  scheduleFrequencyLabel,
  scheduleNextRunLabel,
  scheduleTargetLabel,
} from '../src/components/schedule-catalog-logic.ts'
import type { MobileScheduleEntry } from '../src/types/mobile.ts'

const task = (
  id: string,
  title: string,
  prompt: string,
  status: MobileScheduleEntry['status'],
): MobileScheduleEntry => ({
  id,
  title,
  prompt,
  status,
  scheduledAt: '2026-11-21T09:00:00.000Z',
  target: { kind: 'new' },
})

const items = [
  task('daily-check', 'Daily check', 'Review yesterday', 'active'),
  task('weekly-report', 'Weekly report', 'Summarize this week', 'paused'),
  task('old-reminder', 'Old reminder', 'Check a result', 'ended'),
]

describe('schedule catalog filtering', () => {
  it('filters by status and keeps the input array unchanged', () => {
    expect(filterSchedules(items, 'active', '').map((item) => item.id)).toEqual(['daily-check'])
    expect(filterSchedules(items, 'all', '')).toEqual(items)
    expect(items).toHaveLength(3)
  })

  it('searches title, prompt, and id case-insensitively', () => {
    expect(filterSchedules(items, 'all', 'WEEKLY')).toEqual([items[1]])
    expect(filterSchedules(items, 'all', 'summarize week')).toEqual([items[1]])
    expect(filterSchedules(items, 'all', 'old-reminder')).toEqual([items[2]])
  })

  it('combines status and every whitespace-separated search term', () => {
    expect(filterSchedules(items, 'paused', 'weekly summarize')).toEqual([items[1]])
    expect(filterSchedules(items, 'active', 'weekly')).toEqual([])
  })

  it('formats frequencies, active-only next run, target labels, and desktop recommendations', () => {
    expect(scheduleFrequencyLabel({ ...items[0]!, kind: 'daily', time: '09:30:00.000' })).toBe('每天 09:30')
    expect(scheduleFrequencyLabel({ ...items[0]!, kind: 'weekly', time: '16:00:00', weekdays: [1, 5] })).toBe(
      '每周一、五 16:00',
    )
    expect(scheduleFrequencyLabel({ ...items[0]!, kind: 'every', everySeconds: 7200 })).toBe('每 2 小时')
    expect(scheduleFrequencyLabel({ ...items[0]!, kind: 'after', afterSeconds: 300 })).toBe('一次性')
    expect(scheduleNextRunLabel(items[0]!)).toContain('下次执行：')
    expect(scheduleNextRunLabel(items[1]!)).toBeUndefined()
    expect(scheduleNextRunLabel(items[2]!)).toBeUndefined()
    expect(scheduleTargetLabel({ kind: 'new' })).toBe('每次新建会话')
    expect(scheduleTargetLabel({ kind: 'new_once', sessionId: 's1' })).toBe('新建会话并复用')
    expect(SCHEDULE_RECOMMENDATIONS).toHaveLength(8)
  })
})
