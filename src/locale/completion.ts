/**
 * Copy for the completion notices: what the phone says when a turn finishes, blocks on
 * a question, or fails while the reader is looking elsewhere.
 */

/** Completion notice copy. */
export const completion = {
  /** Notification title when the session list has not named the conversation yet. */
  appName: 'DeepSeek Harness',
  /** State line for a turn that ran to the end. */
  doneSubtitle: '已完成',
  doneBody: '点按查看结果',
  /** State line for a turn that stopped to ask the reader something. */
  askSubtitle: '等你回答',
  askBodyFallback: '有一个问题等你回答',
  /** State line for a tool call waiting on approval. */
  approveSubtitle: '等你确认',
  /** `{tool}` is the tool that needs approval. */
  approveBody: '需要允许 {tool}',
  approveBodyFallback: '有一个操作等你确认',
  /** State line for a turn that ended in an error. */
  failedSubtitle: '出错了',
  failedBodyFallback: '本轮没能完成，点按查看',
  /** State line for a turn that stopped with a plan awaiting the reader. */
  planSubtitle: '方案待确认',
  planBody: '点按查看方案',
  /** `{count}` sessions finished while the app was away. */
  awaySummary: '你离开期间，{count} 个会话完成了',
  permissionDenied: '通知权限未开启，完成时不会有提醒',
  /** Action offered on a question or approval banner. */
  openAction: '打开',
  /** Notification Centre section title for these notices. */
  channelName: '任务进度',
} as const
