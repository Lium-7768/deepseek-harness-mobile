/**
 * Copy for the permission-preset picker, including why the list can be locked.
 */

/** Permission picker copy. */
export const permission = {
  fullAccessBody: '完全权限将允许该会话绕过沙箱限制访问文件和运行命令。确认仅在可信的工作区中继续。',
  confirmationExpiredTitle: '权限确认已失效',
  confirmationExpiredBody: '本次确认已过期或会话已切换，权限未修改。请重新选择权限并确认。',
  selectTitle: '选择权限',
  noProjection: '桌面端没有提供当前会话的权限投影，移动端不会猜测或修改权限。',
  lockedWhileRunning: '会话状态正在确认或会话正在处理，权限暂时锁定。',
  /** Appended to a row's own label by the screen reader. */
  switchFailedTitle: '权限切换失败',
  switchFailedBody: '无法切换权限，请稍后重试。',
} as const
