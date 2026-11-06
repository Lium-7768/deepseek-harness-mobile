/**
 * Copy for a tool-call card: the verb inferred from a tool name, its execution
 * state, and the card's screen-reader label.
 */

/** Tool card copy. */
export const tool = {
  // The desktop's own `tool.title.*` words, so a row reads the same on both
  // clients: 搜索 / 读取 / 运行命令 / 写入 / 编辑 / 代码 / 网页获取 / 工具调用.
  verbSearch: '搜索',
  verbRead: '读取',
  verbReadImage: '读取图片',
  verbCommand: '运行命令',
  verbWrite: '写入',
  verbEdit: '编辑',
  verbCode: '代码',
  verbWeb: '网页获取',
  verbGeneric: '工具调用',

  title: '工具调用',
  input: '输入',
  output: '结果',

  /** `{added}` and `{removed}` are the change's line counts. */
  diffStat: '+{added} −{removed}',
  /** `{shown}` is how many lines the card drew before cutting the change off. */
  diffTruncated: '仅显示前 {shown} 行改动。',
  stateRunning: '运行中',
  stateCompleted: '已完成',
  stateFailed: '失败',
  /** `{tool}` is the card's own title; `{state}` is one of the state words. */
  accessibilityLabel: '{tool}工具{state}',
  /** `{count}` lines the folded payload does not show. */
  hiddenLines: '… 还有 {count} 行',
  /** `{lines}` total lines the payload holds. */
  expandPayload: '展开全部 {lines} 行',
} as const
