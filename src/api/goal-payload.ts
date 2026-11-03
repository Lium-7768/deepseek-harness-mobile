import type { MobileGoalRef, MobileGoalView } from '@/types/mobile'

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Validates desktop CAS references before a successful response reaches a mutation callback. */
export function isGoalRef(value: unknown): value is MobileGoalRef {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    value.id.trim() !== '' &&
    typeof value.revision === 'number' &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 1
  )
}

/** A reference alone is not a view and must never replace the cached Goal. */
export function isGoalView(value: unknown): value is MobileGoalView {
  if (!record(value) || !isGoalRef(value)) return false
  const { objective, phase, activation, blockedReason } = value as Record<string, unknown>
  return (
    typeof objective === 'string' &&
    objective.trim() !== '' &&
    (phase === 'active' || phase === 'paused' || phase === 'blocked' || phase === 'complete') &&
    (activation === undefined || activation === 'armed' || activation === 'disarmed') &&
    (blockedReason === undefined ||
      (record(blockedReason) && (blockedReason.message === undefined || typeof blockedReason.message === 'string')))
  )
}
