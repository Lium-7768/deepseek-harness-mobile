/**
 * Copy for a conversation screen: history loading, the composer, message
 * actions, the connection banner, and the failure alerts those actions raise.
 */

/** Conversation screen copy. */
export const conversation = {
  /** A logged context injection, titled the way the desktop titles it. */
  contextInjection: '上下文注入',
  contextRecall: '跨会话召回',
  systemPrompt: '系统提示词',
  systemPromptUpdate: '系统提示词更新',
  openFromList: '请先连接桌面端并从会话列表打开会话。',
  missingSessionId: '缺少会话标识，请从会话列表打开。',
  goConnect: '去连接',
  backToWorkspace: '返回工作区',
  /** `{count}` pending interactions on this session. */
  pendingCount: '{count} 项操作需要处理',
  // A Turn waiting on the reader: the desktop answers these in a transcript card, the
  // phone names the question and hands over to the pending screen.
  questionWaiting: '需要你回答：{question}',
  questionWaitingMore: '需要你回答：{question}（还有 {count} 个问题）',
  questionWaitingHint: '打开「待处理」作答',
  connecting: '正在连接',
  // Why a Turn started, when the reader did not type it.
  triggerGoal: '目标继续',
  triggerSchedule: '定时任务触发',
  triggerSubagent: '子 Agent 回报',
  triggerJob: '后台任务回报',
  triggerAgent: '其他智能体消息',
  triggerTeam: '协作任务消息',
  triggerWebhook: '外部事件触发',
  triggerGithub: 'GitHub 事件触发',
  triggerPlugin: '插件状态更新',
  triggerSubagentCompleted: '子 Agent 已完成任务',
  triggerSubagentAborted: '子 Agent 已停止',
  triggerSubagentError: '子 Agent 执行失败',
  triggerSubagentMaxTokens: '子 Agent 已达 token 上限',
  triggerSubagentRefusal: '子 Agent 拒绝执行',
  triggerSubagentUnknown: '子 Agent 异常结束',
  // A logged tool-set change, titled the way the desktop titles it.
  toolAdded: '已添加工具：{name}',
  toolRemoved: '已移除工具：{name}',
  toolsUpdated: '工具已更新',
  toolsAddedCount: '新增 {count} 个',
  toolsChanged: '新增 {added} 个，移除 {removed} 个',
  toolsRemovedCount: '移除 {count} 个',
  toolsAdded: '新增：{names}',
  toolsRemoved: '移除：{names}',
  // Structured context-body copy, mirroring desktop `message.context.*`.
  contextInstructionsLoaded: '已载入',
  contextInstructionsAdded: '已新增',
  contextInstructionsUpdated: '已更新',
  contextInstructionsRemoved: '已移除',
  contextCatalogReplaced: '替换目录',
  contextCatalogMore: '…还有 {count} 条',
  contextSnapshotSupersedes: '取代先前的快照',
  contextRelayFrom: '来自会话 {session}',
  contextRecallCounts: '保留 {retained} 条 · 省略 {omitted} 条',
  contextRecallTruncated: '已截断',
  unknownBlock: '未知内容块',
  jsonTruncated: '… 已截断，共 {total} 字符',
  triggerApproval: '审批结果',
  triggerContinue: '继续请求',
  triggerExplanation: '这条通知触发了本轮回复。',
  copyTrigger: '复制触发内容',
  // The Turn's own token accounting, opened from its action row.
  // The desktop's pill reads `用量 2.9M tok`; the action row keeps the same words.
  usageLabel: '用量 {total} tok',
  usageTitle: '本轮用量',
  usageModel: '提供方 / 模型',
  usageCacheHit: '缓存命中',
  usageInput: '输入',
  usageUncachedInput: '未缓存输入',
  usageCacheRead: '缓存读取',
  usageCacheWrite: '缓存写入',
  usageOutput: '输出',
  usageReasoning: '（其中推理 {tokens}）',
  usageCalls: '请求次数',
  // The desktop's header actions, collapsed to counts on a phone.
  headerPending: '{count} 项待处理',
  headerJobs: '{count} 个后台任务',
  headerJobsRunning: '{total} 个后台任务（{running} 运行中）',
  sessionMenu: '会话菜单',
  jobsTitle: '后台任务',
  catalogRunning: '{count} 运行中',
  catalogDone: '{count} 已完成',
  catalogJobs: '{count} 个',
  sessionMenuRename: '重命名会话',
  sessionMenuShare: '分享会话日志',
  shareFailed: '分享失败',
  shareUnsupported: '当前设备不支持分享',
  /** `{completed}` of `{total}` tasks on the shared board. */
  teamTasks: '团队任务 {completed}/{total}',
  teamTasksTitle: '团队任务',
  teamTaskOwner: '负责人 {name}',
  referenceChip: '引用',
  /** `{count}` files a turn produced. */
  deliverables: '产出 {count} 个文件',
  /** `{path}` is the file a tap copies. */
  copyDeliverable: '复制路径：{path}',
  waitingForConfirmation: '等待确认',

  /** One notice covers a failed history, event stream, or interaction read. */
  refreshFailed: '刷新会话失败',
  historyNotLoaded: '历史记录未加载',
  noMessages: '此会话暂无可见消息。',
  noMoreHistory: '当前没有可分页的历史记录。',
  loadOlder: '加载更早消息',
  /** Shown above the first turn once the desktop has nothing older to page. */
  historyStart: '已到会话开头',
  /** Shown while a page is being fetched and folded into the transcript. */
  processingOlder: '正在处理',
  /** Shown when the last page failed, so the same control asks again. */
  retryLoadOlder: '重新加载',
  loadOlderFailedTitle: '加载更早消息失败',
  backToLatest: '返回最新消息',
  /** `{count}` message rows that arrived while the reader was away from the bottom. */
  newMessages: '{count} 条新消息',
  reconnect: '重新连接并刷新',

  // `clock.md` / `clock.ymd` from ui-chat's locale dictionary: the date prefix
  // the message clock grows outside today, then outside this year.
  clockMd: '{m}月{d}日',
  clockYmd: '{y}年{m}月{d}日',

  // `placeholder.default` from ui-conversation's locale dictionary.
  composerPlaceholder: '发消息或创建任务…',

  quoteMessage: '引用这条消息',
  quoted: '已引用到输入框',
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
