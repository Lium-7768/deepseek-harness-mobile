/**
 * Copy for the agent-mode picker, including why the list can be locked once a
 * session has started.
 */

/** Agent mode picker copy. */
export const mode = {
  selectTitle: '选择智能体模式',
  loading: '正在加载智能体模式…',
  loadFailed: '智能体模式加载失败，请稍后重试。',
  noneAvailable: '桌面端没有可用的智能体模式。',
  stateLoading: '正在读取当前会话状态…',
  stateUnavailable: '无法读取当前会话状态，暂时无法切换模式。',
  blankNote: '空白会话可以切换模式；切换结果会记录到会话日志。',
  locked: '会话已经开始，智能体模式已锁定。请在设置中修改新会话默认模式。',
  /** Appended to a row's own label by the screen reader. */
  currentSuffix: '，当前模式',
  switchFailedTitle: '模式切换失败',
  switchFailedBody: '无法切换智能体模式，请稍后重试。',
} as const
