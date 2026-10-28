/**
 * Copy for a tool-call card: the verb inferred from a tool name, its execution
 * state, and the card's screen-reader label.
 */

/** Tool card copy. */
export const tool = {
  verbSearch: '搜索',
  verbRead: '读取',
  verbCommand: '命令',
  verbWrite: '写入',
  verbEdit: '编辑',
  verbCode: '代码',
  verbWeb: '网页',
  verbGeneric: '工具',

  title: '工具调用',
  stateRunning: '运行中',
  stateCompleted: '已完成',
  stateFailed: '失败',
  /** `{tool}` is the card's own title; `{state}` is one of the state words. */
  accessibilityLabel: '{tool}工具{state}',
} as const
