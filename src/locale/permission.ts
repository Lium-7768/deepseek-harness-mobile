/**
 * Copy for the permission-preset picker, including why the list can be locked.
 */

/** Permission picker copy. */
export const permission = {
  selectTitle: '选择权限',
  loading: '正在加载权限…',
  loadFailed: '权限加载失败，请稍后重试。',
  reload: '重新加载权限',
  noPresets: '当前会话没有可切换的权限预设。',
  stateFailedLocked: '会话状态加载失败，权限选项已锁定。',
  stateUnavailable: '无法读取当前会话状态，暂时无法切换权限。',
  noProjection: '桌面端没有提供当前会话的权限投影，移动端不会猜测或修改权限。',
  lockedWhileRunning: '会话状态正在确认或会话正在处理，权限暂时锁定。',
  writeNote: '选择后会通过当前会话的 /permission 命令写入会话日志。',
  fullAccessBody: '这会允许当前会话不受工作区范围限制地访问文件。',
  /** Appended to a row's own label by the screen reader. */
  currentSuffix: '，当前权限',
  switchFailedTitle: '权限切换失败',
  switchFailedBody: '无法切换权限，请稍后重试。',
} as const
