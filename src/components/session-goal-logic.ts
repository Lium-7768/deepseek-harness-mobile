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
    ...(candidate.activation === 'armed' || candidate.activation === 'disarmed'
      ? { activation: candidate.activation }
      : {}),
    ...(phase === 'blocked' && typeof blockedMessage === 'string' && blockedMessage.trim() !== ''
      ? { blockedReason: { message: blockedMessage } }
      : {}),
  }
}

/** Complete and absent goals have no dock; blocked and paused goals can resume. */
export function goalDockState(goal: MobileGoalView | undefined):
  | {
      label: 'goalRunning' | 'goalPaused' | 'goalBlocked'
      action?: 'pause' | 'resume'
    }
  | undefined {
  if (goal === undefined || goal.phase === 'complete') return undefined
  return {
    label:
      goal.phase === 'active' && goal.activation !== 'disarmed'
        ? 'goalRunning'
        : goal.phase === 'blocked'
          ? 'goalBlocked'
          : 'goalPaused',
    ...(goal.phase !== 'active' || goal.activation === 'disarmed'
      ? { action: 'resume' as const }
      : goal.activation === 'armed'
        ? { action: 'pause' as const }
        : {}),
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/** A late live-read/mutation response must never lend activation to another goal revision. */
export function goalWithActivation(
  durable: MobileGoalView | undefined,
  live: MobileGoalView | null | undefined,
): MobileGoalView | undefined {
  if (durable === undefined || !live || live.id !== durable.id || live.revision !== durable.revision) return durable
  return { ...durable, ...(live.activation === undefined ? {} : { activation: live.activation }) }
}
