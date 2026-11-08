/**
 * Reads the shared task board the desktop's team plugin projects into a session.
 *
 * The Host already folds the board — newest revision per task, deletions applied —
 * into the `agentTeam` session projection, so the phone parses that projection
 * instead of replaying `team/task` events itself. The phone only reads it: claiming
 * and closing tasks stays with the agents that own them.
 */

/** One task on the shared board, as the Host's projection describes it. */
export interface TeamTask {
  id: string
  subject: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  ownerName?: string
  blockedBy?: readonly string[]
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/**
 * Reads the board out of the session projections.
 *
 * @param values - `history.projections.values` from the Host.
 * @returns Tasks in board order; an unreadable or disabled board yields none.
 */
export function teamTasks(values: Record<string, unknown> | undefined): TeamTask[] {
  const team = record(values?.agentTeam)
  const tasks = team?.tasks
  if (team?.enabled !== true || !Array.isArray(tasks)) return []
  return tasks.flatMap((value) => {
    const task = record(value)
    const id = text(task?.id)
    const subject = text(task?.subject)
    const status = task?.status
    // A deleted task stays in the projection as a tombstone; the board hides it.
    if (id === undefined || subject === undefined || status === 'deleted') return []
    const description = text(task?.description)
    const ownerName = text(task?.ownerName)
    const blockedBy = Array.isArray(task?.blockedBy)
      ? task.blockedBy.flatMap((entry) => {
          const blocked = text(entry)
          return blocked === undefined ? [] : [blocked]
        })
      : undefined
    return [
      {
        id,
        status: status === 'in_progress' || status === 'completed' ? status : 'pending',
        subject,
        ...(description === undefined ? {} : { description }),
        ...(ownerName === undefined ? {} : { ownerName }),
        ...(blockedBy === undefined || blockedBy.length === 0 ? {} : { blockedBy }),
      },
    ]
  })
}

/**
 * Counts the board for the summary row.
 *
 * @param tasks - The projected board.
 * @returns Completed and total counts.
 */
export function teamTaskProgress(tasks: readonly TeamTask[]): { completed: number; total: number } {
  return { completed: tasks.filter((task) => task.status === 'completed').length, total: tasks.length }
}
