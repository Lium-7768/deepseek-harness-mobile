/** The session's `plan` projection: durable plan mode plus any un-settled toggle. */
export interface PlanState {
  active: boolean
  pending: boolean
}

/**
 * Read the `plan` projection.
 *
 * The value arrives as `unknown` on the wire, so both fields must be booleans;
 * anything else is treated as an absent projection rather than guessed at.
 *
 * @param values - Session projection values, or undefined before they land.
 * @returns The plan state, or undefined when it is absent or malformed.
 */
export function planFromProjection(values: Record<string, unknown> | undefined): PlanState | undefined {
  const raw = values?.plan
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const { active, pending } = raw as Record<string, unknown>
  if (typeof active !== 'boolean' || typeof pending !== 'boolean') return undefined
  return { active, pending }
}

/**
 * Decide whether the composer shows the plan chip.
 *
 * The Web shows it while a toggle is un-settled or while plan mode is on, and
 * hides it once the latest toggle has landed with plan mode off
 * (`PlanModeControl.tsx`: `pending ? !active : active`).
 *
 * @param plan - The projected plan state, or undefined when absent.
 * @returns Whether the chip belongs in the control row.
 */
export function planChipVisible(plan: PlanState | undefined): boolean {
  if (plan === undefined) return false
  return plan.pending ? !plan.active : plan.active
}
