/**
 * Copy for rendered Markdown: the code block header, its copy action, and the
 * collapse control.
 */

/** Markdown copy. */
export const markdown = {
  openLinkFailed: '无法打开链接，请检查地址或稍后重试。',
  // `codeBlock.title` in the desktop dictionary: the banner names the block, not the language.
  code: '代码块',
  wrapCode: '自动换行',
  unwrapCode: '取消自动换行',
  copyCode: '复制代码',
  copied: '代码已复制',
  copyFailedTitle: '复制失败，请重试',
  copyFailed: '复制失败，请重试。',
  collapseBlock: '折叠代码块',
  expandBlock: '展开完整代码块',
  collapse: '收起',
  /** `{count}` lines hidden by the collapse. */
  expandAll: '展开全部 {count} 行',
  copyTable: '复制表格',
  tableCopied: '表格已复制',
  /** `{count}` lines the collapsed code block does not show. */
  hiddenLines: '… 还有 {count} 行',
} as const
