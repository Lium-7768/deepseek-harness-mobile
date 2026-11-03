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

  // `unit.milliseconds` / `unit.seconds` from ui-trajectory's locale: the Web
  // prints milliseconds below one second and seconds with two decimals below
  // ten, so the native tool row reads the same durations.
  durationMilliseconds: '{value} 毫秒',
  durationSeconds: '{value} 秒',
  /** `{action}` is one of the action names above. */
  running: '正在{action}。',
  runningWithTarget: '{action}：{target}',
  toolFailed: '操作未完成，请在桌面端查看详细错误信息。',
  toolDone: '操作完成，可在桌面端查看完整结果。',
} as const
