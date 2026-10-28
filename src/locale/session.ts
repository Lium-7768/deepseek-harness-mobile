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
} as const
