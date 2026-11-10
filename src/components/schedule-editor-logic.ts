import type { MobileScheduleTiming } from '@/types/mobile'

/** Every timing rule the Host accepts, in the order the phone offers them. */
export type TimingKind = 'after' | 'at' | 'cron' | 'daily' | 'every' | 'rrule' | 'weekly'

/** The day names the weekly picker draws, Monday first like the Host's ISO weekdays. */
export const WEEKDAY_LABELS: readonly { iso: number; label: string }[] = [
  { iso: 1, label: '一' },
  { iso: 2, label: '二' },
  { iso: 3, label: '三' },
  { iso: 4, label: '四' },
  { iso: 5, label: '五' },
  { iso: 6, label: '六' },
  { iso: 7, label: '日' },
]

/** One form field's raw text, as typed. */
export interface TimingForm {
  /** `every` only: number of hours between runs. */
  hours: string
  kind: TimingKind
  /** `after` only: minutes from now. */
  minutes: string
  /** `at` only: ISO calendar date. */
  date: string
  /** `daily`, `at` and `weekly`: local wall-clock time. */
  time: string
  /** IANA zone every local rule is written in. */
  timeZone: string
  /** `cron` only: five-field expression. */
  cron: string
  /** `rrule` only: the recurrence rule text. */
  rrule: string
  /** `weekly` only: the selected ISO weekdays. */
  weekdays: readonly number[]
}

/** Reads one `HH:mm` wall-clock field, padding to the Host's `HH:mm:ss`. */
function clockOf(value: string): string | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (match === null) return undefined
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return undefined
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
}

/**
 * Builds the Host timing rule from the form's raw text.
 *
 * The Host accepts the full union — an instant, a delay, an interval, a daily or
 * weekly wall-clock rule, and raw cron or rrule text — so the phone offers all of
 * them and forwards the request unchanged; the Host still validates it.
 *
 * @param form - The chosen kind and the fields it reads.
 * @returns The timing rule, or `undefined` while a field cannot be parsed.
 */
export function timingOf(form: TimingForm): MobileScheduleTiming | undefined {
  const { cron, date, hours, kind, minutes, rrule, time, timeZone, weekdays } = form
  if (kind === 'daily') {
    const clock = clockOf(time)
    if (clock === undefined) return undefined
    return { daily: { time: clock, time_zone: timeZone }, kind: 'daily' }
  }
  if (kind === 'weekly') {
    const clock = clockOf(time)
    // The Host rejects an empty weekday set, so the form does too.
    if (clock === undefined || weekdays.length === 0) return undefined
    return {
      kind: 'weekly',
      weekly: {
        time: clock,
        time_zone: timeZone,
        weekdays: [...new Set(weekdays)].sort((left, right) => left - right),
      },
    }
  }
  if (kind === 'at') {
    const clock = clockOf(time)
    if (clock === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return undefined
    return { at: { date: date.trim(), time: clock, time_zone: timeZone }, kind: 'at' }
  }
  if (kind === 'cron') {
    // Five fields, as the Host's Vixie parser requires; the expression's own meaning is
    // the Host's to judge.
    const expression = cron.trim().split(/\s+/).join(' ')
    if (expression.split(' ').length !== 5) return undefined
    return { cron: { expression, time_zone: timeZone }, kind: 'cron' }
  }
  if (kind === 'rrule') {
    // The Host parses DTSTART and RRULE content itself and reports a structured error,
    // so the form only refuses text that carries nothing at all.
    const rule = rrule.trim()
    return rule === '' ? undefined : { kind: 'rrule', rrule: rule }
  }
  const value = Number((kind === 'every' ? hours : minutes).trim())
  if (!Number.isFinite(value) || value <= 0) return undefined
  return kind === 'every'
    ? { every_seconds: Math.round(value * 3_600), kind: 'every' }
    : { after_seconds: Math.round(value * 60), kind: 'after' }
}
