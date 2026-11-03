/** Prevents permission writes while the host status is unknown, busy, or submitting. */
export function permissionOptionsLocked(input: {
  eventsError: boolean
  eventsPending: boolean
  eventsStale: boolean
  status: string | undefined
  submitting: boolean
}): boolean {
  return input.eventsError || input.eventsPending || input.eventsStale || input.status !== 'idle' || input.submitting
}
