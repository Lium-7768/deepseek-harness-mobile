/**
 * Copy for image and file attachments: the history label, the share sheet, and
 * the preview overlay.
 */

/** Attachment copy. */
export const attachment = {
  historyImages: '历史图片',
  shareUnsupportedTitle: '暂不支持系统分享',
  shareUnsupportedBody: '当前设备无法打开系统分享面板。',
  shareAction: '分享或保存图片',
  share: '分享或保存',
  preparing: '正在准备…',
  shareFailedTitle: '无法分享图片',
  shareFailedBody: '图片未能写入本地分享缓存，请稍后重试。',
  /** `{label}` is the attachment's own name. */
  open: '打开{label}',
  tapToRetry: '轻触重试',
  loadFailed: '图片加载失败，请轻触重试。',
  closePreview: '关闭图片预览',
} as const
