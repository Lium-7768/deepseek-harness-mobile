/** Copy for the composer's task-list dock (`conversation.input.dock` id `todo`). */
export const todo = {
  title: '任务',
  /** Chip form on the composer's dock row: `{done}` of `{total}` finished. */
  chip: '任务 {done}/{total}',
  /** Progress readings, joined by `\u2002·\u2002` with zero counts omitted. */
  progressDone: '{done} 已完成',
  progressActive: '{active} 进行中',
  progressPending: '{pending} 待处理',
  /** Statuses announced beside one decorative marker. */
  statusCompleted: '已完成',
  statusInProgress: '进行中',
  statusPending: '待处理',
} as const
