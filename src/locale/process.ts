/**
 * Copy for the conversation's process group: the single row that stands in for
 * a step's reasoning and tool calls, mirroring the desktop's
 * `message.stepProcess.*` wording so both clients read the same.
 */

/** Process group copy. */
export const process = {
  // Running labels name what the agent is doing right now.
  runningThinking: '正在分析请求',
  runningRead: '正在读取文件',
  runningReadImage: '正在读取图片',
  runningWrite: '正在写入文件',
  runningSearch: '正在搜索代码',
  runningEdit: '正在编辑文件',
  runningCommands: '正在运行命令',
  runningCode: '正在运行代码',
  runningWebSearch: '正在搜索网页',
  runningWebFetch: '正在访问网页',
  runningTools: '正在调用工具',

  // Settled labels summarise the step by activity.
  doneThinking: '已完成分析',
  doneRead: '已读取文件',
  doneReadImage: '已读取图片',
  doneWrite: '已写入文件',
  doneSearch: '已搜索代码',
  doneEdit: '修改了文件',
  doneCommands: '执行了命令',
  doneCode: '运行了代码',
  doneWebSearch: '已搜索网页',
  doneWebFetch: '已访问网页',
  doneTools: '已调用工具',

  /** Separates the activity labels of a step that did more than two things. */
  comma: '，',
  /** Joins exactly two activity labels, as the desktop's `stepProcess.joinTwo` does. */
  joinTwo: '{first}并{second}',
  /** Prefix two labels share, dropped from the second so the pair reads once. */
  sharedPrefix: '已',
  /** Marks a step that kept working after its summary was full. */
  more: '{title}等',
  /** Screen-reader label for the disclosure. */
  expand: '展开处理过程',
  collapse: '收起处理过程',
} as const
