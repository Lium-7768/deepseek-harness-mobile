/**
 * Copy for a conversation screen: history loading, the composer, message
 * actions, the connection banner, and the failure alerts those actions raise.
 */

/** Conversation screen copy. */
export const conversation = {
  openFromList: '请先连接桌面端并从会话列表打开会话。',
  missingSessionId: '缺少会话标识，请从会话列表打开。',
  goConnect: '去连接',
  backToWorkspace: '返回工作区',
  /** `{count}` pending interactions on this session. */
  pendingCount: '{count} 项操作需要处理',
  connecting: '正在连接',
  idle: '空闲',
  waitingForConfirmation: '等待确认',

  historyFailed: '会话历史加载失败',
  eventsFailed: '实时事件加载失败，正在重试',
  interactionsFailed: '待处理操作加载失败，正在重试',
  historyNotLoaded: '历史记录未加载',
  noMessages: '此会话暂无可见消息。',
  noMoreHistory: '当前没有可分页的历史记录。',
  loading: '正在加载…',
  loadOlder: '加载更早消息',
  loadOlderFailedTitle: '加载更早消息失败',
  backToLatest: '返回最新消息',
  /** `{count}` message rows that arrived while the reader was away from the bottom. */
  newMessages: '{count} 条新消息',
  reconnect: '重新连接并刷新',
  viewPending: '查看待处理操作',

  // `clock.md` / `clock.ymd` from ui-chat's locale dictionary: the date prefix
  // the message clock grows outside today, then outside this year.
  clockMd: '{m}月{d}日',
  clockYmd: '{y}年{m}月{d}日',

  // `placeholder.default` from ui-conversation's locale dictionary.
  composerPlaceholder: '发消息或创建任务…',

  copyMessage: '复制消息',
  /** `MessageIconActions`: forks the session at this message. */
  branchFromMessage: '在新对话中分支',
  branchFailedTitle: '分叉会话失败',
  copied: '消息已复制',
  copyFailedTitle: '复制失败，请重试',
  copyFailed: '复制失败，请重试。',

  sendFailedTitle: '消息发送失败',
  sendFailedBody: '消息未发送，请稍后重试',
  stopFailedTitle: '停止任务失败',
  stopFailedBody: '任务未停止，请稍后重试',
  goalFailedTitle: '更新目标失败',
  goalFailedBody: '目标未更新，请稍后重试',
  subagentStopFailedTitle: '停止子 Agent 失败',
  subagentStopFailedBody: '停止请求未发送，请稍后重试',
} as const
