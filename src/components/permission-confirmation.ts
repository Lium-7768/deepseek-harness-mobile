/** Native Alert can be suppressed by an already-presented controller; never retain its gate indefinitely. */
export const PERMISSION_CONFIRMATION_TIMEOUT = 60_000

export function createPermissionConfirmation() {
  let pending: { token: symbol; timer: ReturnType<typeof setTimeout> } | undefined
  const dismiss = (): void => {
    if (pending) clearTimeout(pending.timer)
    pending = undefined
  }
  return {
    get busy() {
      return pending !== undefined
    },
    begin(): symbol {
      dismiss()
      const token = Symbol('permission-confirmation')
      pending = { token, timer: setTimeout(dismiss, PERMISSION_CONFIRMATION_TIMEOUT) }
      return token
    },
    /** Late callbacks from expired alerts cannot release a newer prompt or authorize a command. */
    finish(token: symbol): boolean {
      if (pending?.token !== token) return false
      dismiss()
      return true
    },
    dismiss,
  }
}
