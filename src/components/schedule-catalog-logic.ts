import { format, t as message } from '@/locale'
import { WEEKDAY_LABELS } from '@/components/schedule-editor-logic'
import type { MobileScheduleEntry, MobileScheduleTiming } from '@/types/mobile'

/** Schedule status tabs offered by the mobile task catalog. */
export type ScheduleStatusFilter = 'active' | 'paused' | 'ended' | 'all'

/** Filters the desktop-owned catalog without mutating its source rows. */
export function filterSchedules(
  items: readonly MobileScheduleEntry[],
  status: ScheduleStatusFilter,
  query: string,
): MobileScheduleEntry[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return items.filter((item) => {
    if (status !== 'all' && item.status !== status) return false
    const haystack = `${item.title}\n${item.prompt}\n${item.id}`.toLocaleLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}

function shortTime(value: string | undefined): string {
  if (value === undefined) return '09:00'
  const match = /^(\d{2}:\d{2})/.exec(value.trim())
  return match ? match[1]! : value
}

/** Human-readable timing rule summary aligned with the desktop task list & detail views. */
export function scheduleFrequencyLabel(task: MobileScheduleEntry): string | undefined {
  switch (task.kind) {
    case 'after':
    case 'at':
      return message('schedule.frequencyOnce')
    case 'every': {
      if (task.everySeconds === undefined) return undefined
      if (task.everySeconds % 3_600 === 0) {
        return format('schedule.frequencyEveryHours', { count: Math.max(1, task.everySeconds / 3_600) })
      }
      return format('schedule.frequencyEveryMinutes', { count: Math.max(1, Math.round(task.everySeconds / 60)) })
    }
    case 'daily':
      return format('schedule.frequencyDaily', { time: shortTime(task.time) })
    case 'weekly': {
      const days = (task.weekdays ?? [])
        .map((day) => WEEKDAY_LABELS.find((item) => item.iso === day)?.label)
        .filter((item): item is string => item !== undefined)
        .join('、')
      return format('schedule.frequencyWeekly', {
        days: days || message('schedule.weekdayMon'),
        time: shortTime(task.time),
      })
    }
    case 'cron':
      return task.expression ? format('schedule.frequencyCron', { expression: task.expression }) : undefined
    case 'rrule':
      return message('schedule.frequencyRrule')
    default:
      return undefined
  }
}

/** Formats the next scheduled instant only for active tasks, matching desktop `TaskManagerPage`. */
export function scheduleNextRunLabel(task: MobileScheduleEntry): string | undefined {
  if (task.status !== 'active') return undefined
  const parsed = Date.parse(task.scheduledAt)
  return format('schedule.next', {
    time: Number.isNaN(parsed) ? task.scheduledAt : new Date(parsed).toLocaleString(),
  })
}

/** Formats the delivery target label matching desktop `TaskDetail`. */
export function scheduleTargetLabel(target: MobileScheduleEntry['target']): string {
  if (target.kind === 'new') return message('schedule.detailTargetNew')
  if (target.kind === 'new_once') return message('schedule.detailTargetNewOnce')
  return message('schedule.detailTargetSession')
}

export interface ScheduleRecommendation {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly schedule: string
  readonly prompt: string
  readonly timing: (timeZone: string) => MobileScheduleTiming
}

/** Desktop's eight starter automation recommendations, adapted to prefill `ScheduleEditor`. */
export const SCHEDULE_RECOMMENDATIONS: readonly ScheduleRecommendation[] = [
  {
    id: 'dailyBrief',
    title: message('schedule.recommendDailyBriefTitle'),
    description: message('schedule.recommendDailyBriefDesc'),
    schedule: message('schedule.recommendDailyBriefWhen'),
    prompt: message('schedule.recommendDailyBriefPrompt'),
    timing: (timeZone) => ({
      kind: 'weekly',
      weekly: { time: '09:00:00', time_zone: timeZone, weekdays: [1, 2, 3, 4, 5] },
    }),
  },
  {
    id: 'weeklyReview',
    title: message('schedule.recommendWeeklyReviewTitle'),
    description: message('schedule.recommendWeeklyReviewDesc'),
    schedule: message('schedule.recommendWeeklyReviewWhen'),
    prompt: message('schedule.recommendWeeklyReviewPrompt'),
    timing: (timeZone) => ({ kind: 'weekly', weekly: { time: '16:00:00', time_zone: timeZone, weekdays: [5] } }),
  },
  {
    id: 'issueScan',
    title: message('schedule.recommendIssueScanTitle'),
    description: message('schedule.recommendIssueScanDesc'),
    schedule: message('schedule.recommendIssueScanWhen'),
    prompt: message('schedule.recommendIssueScanPrompt'),
    timing: (timeZone) => ({
      kind: 'weekly',
      weekly: { time: '10:00:00', time_zone: timeZone, weekdays: [1, 2, 3, 4, 5] },
    }),
  },
  {
    id: 'pluginCompat',
    title: message('schedule.recommendPluginCompatTitle'),
    description: message('schedule.recommendPluginCompatDesc'),
    schedule: message('schedule.recommendPluginCompatWhen'),
    prompt: message('schedule.recommendPluginCompatPrompt'),
    timing: (timeZone) => ({ kind: 'daily', daily: { time: '10:00:00', time_zone: timeZone } }),
  },
  {
    id: 'topicTracking',
    title: message('schedule.recommendTopicTrackingTitle'),
    description: message('schedule.recommendTopicTrackingDesc'),
    schedule: message('schedule.recommendTopicTrackingWhen'),
    prompt: message('schedule.recommendTopicTrackingPrompt'),
    timing: (timeZone) => ({ kind: 'daily', daily: { time: '09:00:00', time_zone: timeZone } }),
  },
  {
    id: 'branchCleanup',
    title: message('schedule.recommendBranchCleanupTitle'),
    description: message('schedule.recommendBranchCleanupDesc'),
    schedule: message('schedule.recommendBranchCleanupWhen'),
    prompt: message('schedule.recommendBranchCleanupPrompt'),
    timing: (timeZone) => ({ kind: 'weekly', weekly: { time: '17:00:00', time_zone: timeZone, weekdays: [5] } }),
  },
  {
    id: 'weather',
    title: message('schedule.recommendWeatherTitle'),
    description: message('schedule.recommendWeatherDesc'),
    schedule: message('schedule.recommendWeatherWhen'),
    prompt: message('schedule.recommendWeatherPrompt'),
    timing: (timeZone) => ({ kind: 'daily', daily: { time: '07:30:00', time_zone: timeZone } }),
  },
  {
    id: 'workout',
    title: message('schedule.recommendWorkoutTitle'),
    description: message('schedule.recommendWorkoutDesc'),
    schedule: message('schedule.recommendWorkoutWhen'),
    prompt: message('schedule.recommendWorkoutPrompt'),
    timing: (timeZone) => ({ kind: 'weekly', weekly: { time: '20:00:00', time_zone: timeZone, weekdays: [7] } }),
  },
]
