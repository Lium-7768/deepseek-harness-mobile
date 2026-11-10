/**
 * Copy for the transcript's context line.
 *
 * The tab row and the trajectory ledger are desktop-only: a phone screen cannot show
 * a second column beside the conversation, and the ledger restated rows the transcript
 * already draws.
 */

/** Workbench copy. */
export const workbench = {
  /** `{name}` is the injected context's name. */
  contextInjection: '上下文注入 · {name}',
  /** `{name}` is the first injected source; `{count}` the number of them. */
  contextInjectionMore: '上下文注入 · {name} 等 {count} 个',
} as const
