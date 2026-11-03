import type { MobileGoalView } from '@/types/mobile'

/** Reads the desktop's whole goal projection, including its compare-and-set reference. */
export function goalFromProjection(values: Record<string, unknown> | undefined): MobileGoalView | undefined {
  const projection = record(values?.goal)
  const candidate = record(projection?.goal) ?? projection
  if (candidate === undefined) return undefined
  const { id, objective, revision, phase } = candidate
  if (typeof id !== 'string' || id.trim() === '' || typeof objective !== 'string' || objective.trim() === '')
    return undefined
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1) return undefined
  if (phase !== 'active' && phase !== 'paused' && phase !== 'blocked' && phase !== 'complete') return undefined
  const blockedMessage = record(candidate.blockedReason)?.message
  return {
    id,
    objective,
    revision,
    phase,
    ...(typeof blockedMessage === 'string' && blockedMessage.trim() !== ''
      ? { blockedReason: { message: blockedMessage } }
      : {}),
  }
}

/** Complete and absent goals have no dock; blocked and paused goals can resume. */
export function goalDockState(goal: MobileGoalView | undefined):
  | {
      label: 'goalRunning' | 'goalPaused' | 'goalBlocked'
      action: 'pause' | 'resume'
    }
  | undefined {
  if (goal === undefined || goal.phase === 'complete') return undefined
  return {
    label: goal.phase === 'active' ? 'goalRunning' : goal.phase === 'paused' ? 'goalPaused' : 'goalBlocked',
    action: goal.phase === 'active' ? 'pause' : 'resume',
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}
