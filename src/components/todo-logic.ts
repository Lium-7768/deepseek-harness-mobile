import { format, t as message } from '@/locale'

/** One task in the session's `todos` projection. */
export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

const STATUSES = new Set<TodoItem['status']>(['pending', 'in_progress', 'completed'])

/**
 * Read the `todos` projection.
 *
 * The projection arrives as `unknown` on the wire, so every entry is validated:
 * a malformed member is dropped rather than rendered, and an absent or empty
 * list means the dock prints nothing at all.
 *
 * @param values - Session projection values, or undefined before they land.
 * @returns The valid tasks, or undefined when the projection is absent or empty.
 */
export function todoFromProjection(values: Record<string, unknown> | undefined): TodoItem[] | undefined {
  const raw = values?.todos
  if (!Array.isArray(raw)) return undefined
  const todos = raw.flatMap((entry): TodoItem[] => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return []
    const { content, status } = entry as Record<string, unknown>
    if (typeof content !== 'string' || content.trim() === '') return []
    if (typeof status !== 'string' || !STATUSES.has(status as TodoItem['status'])) return []
    return [{ content, status: status as TodoItem['status'] }]
  })
  return todos.length > 0 ? todos : undefined
}

/**
 * Compose the readings beside the dock's title.
 *
 * The Web joins every non-zero figure with an EN SPACE around a middle dot
 * (`todo.progress.*` in `ui-conversation/locales.ts`), and omits a zero count
 * entirely rather than printing `0 已完成`.
 *
 * @param todos - Tasks currently in the projection.
 * @returns The joined readings, or undefined when nothing is left to count.
 */
export function todoProgressLabel(todos: readonly TodoItem[]): string | undefined {
  const done = todos.filter((todo) => todo.status === 'completed').length
  const active = todos.filter((todo) => todo.status === 'in_progress').length
  const pending = todos.filter((todo) => todo.status === 'pending').length
  const readings = [
    done > 0 ? format('todo.progressDone', { done }) : undefined,
    active > 0 ? format('todo.progressActive', { active }) : undefined,
    pending > 0 ? format('todo.progressPending', { pending }) : undefined,
  ].filter((reading): reading is string => reading !== undefined)
  return readings.length > 0 ? readings.join('\u2002·\u2002') : undefined
}

/**
 * Name a task's status for the screen reader beside its decorative marker.
 *
 * @param status - The task's lifecycle state.
 * @returns The localized status label.
 */
export function todoStatusLabel(status: TodoItem['status']): string {
  if (status === 'completed') return message('todo.statusCompleted')
  return status === 'in_progress' ? message('todo.statusInProgress') : message('todo.statusPending')
}
