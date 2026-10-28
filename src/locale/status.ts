/**
 * Copy for the conversation status rows: the Think disclosure, retried model
 * requests, executed commands, and compaction summaries.
 */

/** Conversation status copy. */
export const status = {
  viewThink: '查看 Think 内容',
  /** `{attempt}` is the retry number. */
  retryLabel: '已重试模型请求，第 {attempt} 次',
  /** `{attempt}`, `{max}`, and `{seconds}` describe one retry. */
  retryDetail: '已重试模型请求（{attempt}/{max}）· {seconds}s',
  retryDelay: '重试延迟',
  failureReason: '失败原因',
  turnFailed: '本回合执行失败',
  /** `{name}` is the command the model ran. */
  commandRun: '执行命令：{name}',
  /** `{name}` is the command when it could not be identified as a run. */
  commandName: '命令：{name}',
  running: '执行中',
  failed: '失败',
  maxTokensNote: '已达到最大输出 token，内容可能不完整。',
  viewCompaction: '查看压缩摘要',
  compacted: '对话已压缩',
  compactedBody: '历史消息已汇总。',
  /** `{count}` collapsed messages. */
  collapsedItems: '已折叠 {count} 条消息',
  /** `{count}` tokens, rounded. */
  collapsedTokens: '约 {count} tokens',
  /** `{minutes}` and `{seconds}` for a duration over a minute. */
  durationMinutes: '{minutes}分{seconds}秒',
  durationSeconds: '{seconds}秒',
} as const
