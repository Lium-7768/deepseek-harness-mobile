/**
 * Copy for the trajectory projection: the titles a projected step carries and
 * the human names a tool call is given.
 *
 * Tool names come from the model, so they are matched loosely here rather than
 * enumerated; an unrecognised tool falls back to a generic action name.
 */

/** Trajectory step titles and tool action names. */
export const trajectory = {
  userRequest: '你的请求',
  analyze: '分析问题',
  generateReply: '生成回复',
  executeAction: '执行操作',
  reconnecting: '正在重新连接模型',
  turnIncomplete: '本次任务未完成',
  referencesLoaded: '已加载参考资料',
  historyCompacted: '已整理历史内容',
  needsConfirmation: '需要你的确认',
  tool: '工具',

  actionRunCommand: '运行命令',
  actionReadFile: '读取文件',
  actionEditFile: '编辑文件',
  actionSearch: '搜索资料',
  actionUpdateTodo: '更新任务清单',
  actionViewGoal: '查看当前目标',
  actionViewJobOutput: '查看任务输出',
  actionBrowse: '访问网页',

  /** `{seconds}` already carries one decimal. */
  durationSeconds: '{seconds}秒',
  durationMinutesSeconds: '{minutes}分{seconds}秒',
  /** `{action}` is one of the action names above. */
  running: '正在{action}。',
  runningWithTarget: '{action}：{target}',
  toolFailed: '操作未完成，请在桌面端查看详细错误信息。',
  toolDone: '操作完成，可在桌面端查看完整结果。',
} as const
