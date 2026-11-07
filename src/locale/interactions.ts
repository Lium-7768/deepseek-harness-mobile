/**
 * Copy for the pending-interaction screen: the approval card, the question card
 * with its custom answer box, the plan-review card, and the states around them.
 */

/** Pending-interaction copy. */
export const interactions = {
  title: '待处理操作',
  backToSession: '返回会话',
  intro: '以下请求来自已配对的桌面端 DSH 运行时。请查看详情后再响应。',

  notConnected: '尚未连接桌面端',
  notConnectedBody: '请先完成配对，再查看待处理操作。',
  goConnect: '去连接',
  invalidSession: '会话标识无效',
  invalidSessionBody: '返回会话后重试。',

  loading: '正在加载待处理操作…',
  loadFailedTitle: '加载失败',
  loadFailedBody: '待处理操作加载失败',
  empty: '暂无待处理操作',
  emptyBody: '新的权限请求或问题会显示在这里。',

  permissionRequest: '权限请求',
  permissionIntro: 'DSH 请求使用此工具的权限。',
  deny: '拒绝',
  allowOnce: '仅允许一次',

  question: '问题',
  /** `{label}` is one choice's own label. */
  optionSelected: '{label}，已选中',
  /** `{question}` is the question being answered freely. */
  customAnswer: '自定义回答：{question}',
  customAnswerPlaceholder: '可选：输入自定义回答',
  customAnswerToggle: '其他答案',

  respond: '发送响应',
  responding: '发送中…',
  respondFailedTitle: '响应发送失败',
  respondFailedBody: '无法发送响应',

  /** `{id}` is the desktop approval identifier. */

  planReview: '计划审阅',
  discuss: '讨论',

  connectFirst: '请先将此移动端连接到桌面端，再查看待处理操作。',
  missingSession: '缺少会话标识，无法加载待处理操作。',
} as const
