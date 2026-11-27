/**
 * Copy for the conversation status rows: the Think disclosure, retried model
 * requests, executed commands, and compaction summaries.
 */

/** Conversation status copy. */
export const status = {
  /** The live "working" line under the transcript, as `ui-chat` prints it. */
  deepDiving: '深度求索中',
  /** `{duration}` is the running Turn's elapsed time; the trailing dots are the desktop's own. */
  deepDivingFor: '深度求索中，用时 {duration} ···',
  /** The Think disclosure's title row, as the desktop prints it. */
  think: '思考',
  viewThink: '查看思考内容',
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
  commandTitle: '指令',
  commandRunning: '执行中…',
  commandDone: '已完成',
  commandFailed: '指令失败',
  maxTokensTitle: '已达到输出 token 上限',
  maxTokensHint: '回答被截断，已有输出保留在对话中。发送“继续”可让模型接着输出。',
  viewCompaction: '查看压缩摘要',
  compacted: '上下文已压缩',
  compactedSummary: '已压缩 {items} 条历史记录（约 {tokens} tokens）',
  compactedExpand: '点击查看压缩摘要',
  compactedUnavailable: '压缩摘要不可用',
  /** `{minutes}` and `{seconds}` for a duration over a minute. */
  durationMinutes: '{minutes}分{seconds}秒',
  durationSeconds: '{seconds}秒',
  /** Under one second the desktop prints milliseconds, so a first turn is not `0秒`. */
  durationMilliseconds: '{milliseconds}毫秒',
} as const
