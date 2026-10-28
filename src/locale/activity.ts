/**
 * Copy for the agent-activity panel: goal controls, background jobs, and the
 * child-subagent rows.
 */

/** Agent activity copy. */
export const activity = {
  goalRunning: '执行中',
  goalPaused: '已暂停',
  goalBlocked: '已阻塞',
  pauseGoal: '暂停目标',
  resumeGoal: '继续目标',
  editGoal: '编辑目标',
  clearGoal: '清除目标',
  goalLabel: '目标内容',

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
} as const
