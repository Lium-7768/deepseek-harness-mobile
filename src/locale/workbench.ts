/**
 * Copy for the workbench tabs and the trajectory list.
 */

/** Workbench copy. */
export const workbench = {
  chat: '对话',
  trajectory: '轨迹',
  emptyTrajectory: '该会话尚无可展示的操作轨迹。',
  /** `{duration}` is already formatted. */
  elapsed: '，耗时 {duration}',
  activityRunning: '进行中',
  activityFailed: '失败',
  activityCompleted: '已完成',
  /** `{turn}` is the turn number. */
  turn: '第 {turn} 轮',
  /** `{name}` is the injected context's name. */
  contextInjection: '上下文注入 · {name}',
  /** `{name}` is the first injected source; `{count}` the number of them. */
  contextInjectionMore: '上下文注入 · {name} 等 {count} 个',
} as const
