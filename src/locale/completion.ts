/**
 * Copy for the completion notices: what the phone says when a turn finishes while the
 * reader is looking elsewhere, and what it says when they come back.
 */

/** Completion notice copy. */
export const completion = {
  title: '任务已完成',
  /** `{title}` is the finished session's name. */
  body: '{title} 已完成',
  bodyFallback: '有一个会话已完成',
  /** `{count}` sessions finished while the app was away. */
  awaySummary: '你离开期间，{count} 个会话完成了',
  permissionDenied: '通知权限未开启，完成时不会有提醒',
} as const
