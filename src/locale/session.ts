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
  running: '处理中',
  timeUnknown: '时间未知',
  ungrouped: '未分组',
  /** Same-year timestamp; `{month}` and `{day}` are 1-based. */
  dateSameYear: '{month}月{day}日',
  /** Older timestamp that needs the year. */
  dateWithYear: '{year}年{month}月{day}日',

  /** `{turns}` completed turns and `{steps}` steps. */
  statsTurns: '{turns} 轮 · {steps} 步',
  /** `{duration}` is already formatted for display. */
  statsToolTime: '工具调用 {duration}',
  statsFirstToken: '首 token 平均 {duration}',
  /** `{percent}` is a rounded integer. */
  statsCacheHit: '缓存命中 {percent}%',
  statsTokens: '输入 {input} tok · 输出 {output} tok',

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
