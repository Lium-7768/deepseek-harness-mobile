import type { MobileScheduleTiming } from '@/types/mobile'

/** The three timing rules the phone offers; the Host accepts far more. */
export type TimingKind = 'after' | 'daily' | 'every'

/**
 * Builds the Host timing rule from the form's raw text.
 *
 * @param form - The chosen kind and the field it reads.
 * @returns The timing rule, or `undefined` while a field cannot be parsed.
 */
export function timingOf({
  hours,
  kind,
  minutes,
  time,
  timeZone,
}: {
  hours: string
  kind: TimingKind
  minutes: string
  time: string
  timeZone: string
}): MobileScheduleTiming | undefined {
  if (kind === 'daily') {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
    if (match === null) return undefined
    const hour = Number(match[1])
    const minute = Number(match[2])
    if (hour > 23 || minute > 59) return undefined
    const padded = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
    return { daily: { time: padded, time_zone: timeZone }, kind: 'daily' }
  }
  const value = Number((kind === 'every' ? hours : minutes).trim())
  if (!Number.isFinite(value) || value <= 0) return undefined
  return kind === 'every'
    ? { every_seconds: Math.round(value * 3_600), kind: 'every' }
    : { after_seconds: Math.round(value * 60), kind: 'after' }
}
