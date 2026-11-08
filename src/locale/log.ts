/**
 * Copy for session-log export: the drawer action, the alerts it raises, and the
 * headings the Markdown renderer writes into the exported file.
 */

/** Session-log export copy. */
export const log = {
  action: '导出日志',
  dialogTitle: '导出会话日志',
  failedTitle: '导出会话日志失败',
  unsupportedTitle: '无法导出',
  unsupportedBody: '当前设备没有可用的分享面板。',
  emptyTitle: '暂无可导出内容',
  emptyBody: '这个会话还没有消息。',

  headerSessionId: '会话 ID',
  headerExportedAt: '导出时间',
  headerTruncated: '本文件只包含最近的记录，更早的部分未能取回。',
  roleUser: '用户',
  roleAssistant: '助手',
  roleReasoning: '思考过程',
  sectionTool: '工具 · {name}',
  sectionCommand: '命令 · {name}',
  sectionRetry: '重试',
  sectionTurnError: '回合错误',
  sectionTurnMaxTokens: '回合中断',
  sectionDeliverables: '产出文件',
  sectionTrigger: '触发来源',
  sectionCompaction: '上下文压缩',
  stateCompleted: '已完成',
  stateFailed: '失败',
  stateRunning: '运行中',
  stateSuccess: '成功',
  stateError: '出错',
  fieldState: '状态',
  fieldInput: '输入',
  fieldOutput: '输出',
  retryDetail: '第 {retry}/{maxRetries} 次重试，等待 {delayMs} 毫秒；失败原因：{message}',
  turnMaxTokensBody: '模型在本回合达到 token 上限，输出被截断。',
  compactionDetail: '压缩了 {items} 条记录、{tokens} 个 token。',
} as const
