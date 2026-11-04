/**
 * Copy for the model picker, including why the current routing can be
 * unavailable while the catalog still loads.
 */

/** Model picker copy. */
export const model = {
  routingUnavailable: '当前会话没有可用的模型路由。',
  providerUnavailable: '供应商 {name} 暂时不可用。',
  catalogFailed: '模型目录加载失败，请重新加载。',
  retryCatalog: '重新加载模型',
  noAvailableModels: '暂无可用模型',
  selectTitle: '选择模型',
  reasoningEffort: '推理等级',
  providerDefault: '默认推理等级',
  resetEffort: '恢复模型默认推理等级',
  noReasoningEffort: '此模型不支持推理等级',
  previousModel: '上一个模型',
  nextModel: '下一个模型',
  position: '{current} / {total}',
  /** Reasoning depth labels; the catalog sends these ids. */
  effortOff: '关闭',
  effortLow: '低',
  effortMedium: '中',
  effortHigh: '高',
  /** `{name}` is the unreachable provider. */
  switchFailedTitle: '模型切换失败',
  switchFailedBody: '无法切换模型，请稍后重试。',
} as const
