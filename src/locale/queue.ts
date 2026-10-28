/**
 * Copy for the queued-turn dock: the queue summary, the edit and remove actions
 * with their guard messages, and the steer action.
 */

/** Queued-turn copy. */
export const queue = {
  /** `{count}` queued turns; `{action}` is the expand or collapse verb. */
  summary: '{count} 条待发送消息{action}',
  /** Header form without the expand verb. */
  header: '{count} 条待发送消息',
  expand: '，展开列表',
  collapse: '，收起列表',

  edit: '编辑待发送消息',
  save: '保存待发送消息',
  cancelEdit: '取消编辑待发送消息',
  remove: '移除待发送消息',
  cannotEditWithAttachment: '含附件的待发送消息不可编辑',
  cannotRemove: '无法移除待发送消息，请稍后重试。',
  cannotEdit: '无法编辑待发送消息，请稍后重试。',

  steer: '立即引导处理此消息',
  steerUnavailable: '会话未运行，暂不能引导消息',
  cannotSteer: '无法引导待发送消息，请稍后重试。',

  imagePlaceholder: '[图片]',
  attachmentPlaceholder: '[待发送附件]',

  failedTitle: '队列操作失败',
} as const
