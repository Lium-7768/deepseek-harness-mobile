/**
 * Copy for the message-feedback control and the failures it can report.
 */

/** Message feedback copy. */
export const feedback = {
  rate: '赞成',
  rated: '已赞成，再按一次取消',
  unrate: '反对',
  unrated: '已反对，再按一次取消',
  loadFailed: '评价记录加载失败。',
  saveFailed: '评价失败，请稍后重试。',
  noSession: '会话不存在，无法保存评价。',
  noMessage: '该消息已不存在，无法保存评价。',
  noteRejected: '备注不合法，请检查后重试。',
} as const
