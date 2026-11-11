/**
 * The cover's timing budget, separated from the component so the mount-relative math
 * stays testable without a device.
 */

/** The mark's own entrance: outline, hold, then fill. */
export const ENTER_MS = 320
/**
 * Everything the mark does. Long enough to be a gesture rather than a flicker: the
 * outline arrives, holds while the reader recognises it, then the fill lands.
 */
export const WARM_UP_MS = 3_200
/**
 * Shortest beat the finished mark holds before the cover leaves.
 *
 * Part of the total budget rather than added on top of it: the two once summed, and a
 * slow runtime start stacked the whole gesture on top of its own delay.
 */
export const MIN_READY_HOLD_MS = 1_200
/** How long the cover's fade takes once the budget is spent. */
export const EXIT_MS = 240

/**
 * How long the cover stays after the app reports it is ready.
 *
 * The budget belongs to the whole launch, measured from mount, not to readiness: the
 * gesture plays while the runtime reads the stored connection, so a late `ready` must
 * not add the full gesture on top of the wait that already happened. The result is
 * never shorter than zero, and never shorter than the entrance that already played.
 *
 * @param mountedAt - When the cover first drew, in epoch milliseconds.
 * @param readyAt - When the app reported its first screen could render.
 * @returns Milliseconds to hold the cover after readiness.
 */
export function coverHoldMs(mountedAt: number, readyAt: number): number {
  const total = WARM_UP_MS + Math.max(ENTER_MS + 100, MIN_READY_HOLD_MS)
  return Math.max(0, total - (readyAt - mountedAt))
}
