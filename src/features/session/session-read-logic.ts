export type SessionReadSnapshot = {
  sessionId: string
  client: unknown
  rowCount: number
  running: boolean
}

/**
 * Decides whether the conversation screen should report the session as read.
 *
 * Marks read on session open, on API client connection, when a watched turn
 * finishes (`running: true -> false`), or when new rows land while idle.
 * Streaming chunks during an active turn do not trigger repeated requests.
 */
export function shouldMarkSessionRead(previous: SessionReadSnapshot | undefined, next: SessionReadSnapshot): boolean {
  if (previous === undefined) return true
  if (previous.sessionId !== next.sessionId) return true
  if (next.client !== undefined && previous.client !== next.client) return true
  if (previous.running && !next.running) return true
  if (!next.running && next.rowCount > previous.rowCount) return true
  return false
}
