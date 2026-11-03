export class MobileEventStreamError extends Error {
  constructor(readonly status: number) {
    super('Mobile event stream failed with HTTP ' + status + '.')
    this.name = 'MobileEventStreamError'
  }
}

export function requiresRePair(error: unknown): boolean {
  return error instanceof MobileEventStreamError && (error.status === 401 || error.status === 403)
}
