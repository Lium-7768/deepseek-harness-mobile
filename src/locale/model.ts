/**
 * Copy for the model picker, including why the current routing can be
 * unavailable while the catalog still loads.
 */

/** Model picker copy. */
export const model = {
  selectTitle: '选择模型',
  noneAvailable: '桌面端没有可用模型。',
  note: '模型选择会记录到当前会话日志，并由桌面端验证是否可用。',
  routingUnavailable: '当前会话的模型路由不可用。',
  loading: '正在加载模型目录…',
  loadFailed: '模型目录加载失败，请稍后重试。',
  /** `{name}` is the unreachable provider. */
  providerUnavailable: '{name}：模型目录加载失败。',
  switchFailedTitle: '模型切换失败',
  switchFailedBody: '无法切换模型，请稍后重试。',
} as const
