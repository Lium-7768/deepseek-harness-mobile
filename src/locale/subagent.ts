/**
 * Copy for the child-subagent conversation: its own composer, the read-only
 * notice for a one-shot child, and the failure alerts.
 */

/** Subagent screen copy. */
export const subagent = {
  title: '子 Agent',
  readOnlyTitle: '子 Agent（只读）',
  invalidAddress: '子 Agent 地址无效。',
  missingAddress: '缺少子 Agent 地址或桌面连接，请返回父会话后重试。',
  inheritedPermission: '此会话通过父 Agent 的桌面权限继续执行。',
  oneShotNotice: '一次性子 Agent 的历史可查看，但不能继续发送消息。',
  stopAction: '停止子 Agent',

  loading: '正在加载子 Agent 历史…',
  loadFailed: '子 Agent 历史加载失败',
  noMessages: '此子 Agent 暂无可见消息。',
  composerPlaceholder: '向子 Agent 发送消息…',

  sendFailedTitle: '消息发送失败',
  sendFailedBody: '子 Agent 未收到消息',
  stopFailedTitle: '停止子 Agent 失败',
  stopFailedBody: '停止请求未发送',
} as const
