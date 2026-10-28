/**
 * Copy for the pairing-scan screen: the camera permission gate, the framing
 * hint, and the two invalid-payload failures.
 */

/** Pairing scan copy. */
export const scan = {
  hint: '在桌面端打开“Mobile devices”，生成二维码后将它置于取景框内。',
  cameraPermissionTitle: '需要相机权限',
  cameraPermissionBody: '扫描桌面端配对二维码需要使用本机相机。',
  allowCamera: '允许使用相机',
  frame: '配对二维码扫描取景框',
  frameHint: '将配对二维码放入框内',
  redeeming: '正在完成安全配对…',
  manualInstead: '改为手动输入',
  back: '返回连接页',
  invalidCode: '二维码不是有效的 DeepSeek Harness 配对码。',
  invalidGateway: '二维码中的网关地址无效。',
} as const
