/**
 * Copy for conversation surfaces: the drawer's session rows, the statistics
 * line, and the labels a projected event falls back to when the payload omits
 * a name.
 *
 * Messages carrying `{name}` placeholders are resolved through `format()`.
 */

/** Conversation and session-row copy. */
export const session = {
  newSession: '新会话',
  untitled: '未命名会话',
  timeUnknown: '时间未知',
  /** Compact relative time, matching the desktop sidebar's `time.*` dictionary. */
  timeNow: '刚刚',
  timeMinutes: '{n}分钟',
  timeHours: '{n}小时',
  timeDays: '{n}天',
  timeMonths: '{n}个月',
  timeYears: '{n}年',
  ungrouped: '未分组',
  /** Same-year timestamp; `{month}` and `{day}` are 1-based. */
  dateSameYear: '{month}月{day}日',
  /** Older timestamp that needs the year. */
  dateWithYear: '{year}年{month}月{day}日',

  /** `{turns}` completed turns and `{steps}` steps, matching `stats.counts`. */
  statsCounts: '{turns} 轮 {steps} 步',
  /** `{count}` is an already-compacted token total, matching `message.turnUsage.count`. */
  statsTokens: '{count} tok',
  /** `{percent}` may carry decimals when a near-full cache hit would round up. */
  statsCacheHit: '缓存命中 {percent}%',
  /** `{percent}` is the composer dock's context-occupancy reading. */
  contextUsed: '上下文已用 {percent}%',
  contextUsedLabel: '上下文已用',
  /** Context panel legend, in `ContextMeter` bar-segment order. */
  contextSystem: '系统提示词',
  contextTools: '工具定义',
  contextMessages: '对话消息',

  /** Statistics panels opened from a dock pill (`StatsPills` / stat-dialog). */
  statsDialogTitle: '会话统计',
  statsUsageTitle: 'Token 用量',
  statsModelTime: '模型用时',
  statsToolCallTime: '工具调用用时',
  statsFirstTokenLabel: '首 token 平均（TTFT）',
  statsSpeedLabel: '输出速度（TPS）',
  statsCacheHitLabel: '缓存命中',
  statsInputLabel: '未缓存输入',
  statsCacheReadLabel: '缓存读取',
  statsCacheWriteLabel: '缓存写入',
  statsOutputLabel: '输出',

  toolCall: '工具调用',
  toolResult: '工具结果',
  command: '命令',
  commandResult: '命令结果',
  modelRequestFailed: '模型请求失败。',

  /** Composer mode names and the sentence each one explains itself with. */
  modeStandard: '标准模式',
  modePtc: 'PTC 模式',
  modeMinimal: '极简模式',
  modeCreative: '创造模式',

  permissionReadOnlyBadge: '只读',
  permissionWorkspaceBadge: '工作区写入',
  permissionFullBadge: '完全访问',
  permissionReadOnlySentence: '禁止写入工作区。',
  permissionWorkspaceSentence: '允许在工作区内写入文件。',
  permissionFullSentence: '不限制工作区访问范围。',
  permissionDesktopPreset: '由桌面端提供的权限预设。',
  selectModel: '选择模型',
} as const
