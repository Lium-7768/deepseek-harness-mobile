/**
 * Copy for the agent-activity panel: goal controls, background jobs, and the
 * child-subagent rows.
 */

/** Agent activity copy. */
export const activity = {
  goalRunning: '进行中的目标',
  goalPaused: '已暂停的目标',
  goalBlocked: '受阻的目标',
  pauseGoal: '暂停目标',
  resumeGoal: '恢复目标',
  goalActions: '目标操作',
  /** Asks before the one goal verb that cannot be undone. */
  clearGoalBody: '清除后这个目标会停止，已写下的目标内容不会保留。',
  editGoal: '编辑目标',
  clearGoal: '清除目标',
  goalLabel: '目标内容',
  saveGoal: '保存目标',
  cancelGoalEdit: '取消编辑',
  createGoal: '新建目标',
  createGoalPlaceholder: '描述这个会话要完成的目标…',

  backgroundJobs: '后台任务',
  subagents: '子 Agent',
  /** `{name}` is the child's label or id. */
  openSubagent: '打开子 Agent：{name}',
  /** `{name}` is the child's label or id. */
  stopSubagent: '停止子 Agent：{name}',

  subagentRunning: '运行中',
  subagentIdle: '空闲',
  subagentContinuable: '可继续',
  subagentOneShot: '一次性',
  /** `{name}` and `{reason}` describe an unusable child agent. */
  subagentDiagnostic: '子 Agent {name} 当前不可用（{reason}）。',
  subagentReasonCorrupt: '记录损坏',
  subagentReasonUnsupported: '类型不受支持',
  subagentReasonUnavailable: '无法读取',
} as const
