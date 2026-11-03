/**
 * Copy for the model picker, including why the current routing can be
 * unavailable while the catalog still loads.
 */

/** Model picker copy. */
export const model = {
  selectTitle: '选择模型',
  reasoningEffort: '推理等级',
  /** Reasoning depth labels; the catalog sends these ids. */
  effortOff: '关闭',
  effortLow: '低',
  effortMedium: '中',
  effortHigh: '高',
  searchPlaceholder: '搜索模型',
  /** Accessible name for the button that empties the search field. */
  clearSearch: '清除搜索',
  /** Filter chip that clears the provider filter. */
  allProviders: '全部',
  /** Heading over the model the session already runs. */
  currentSection: '当前',
  /** Shown when the query matches no model in the catalog. */
  noMatches: '没有匹配的模型',
  /** `{provider}` is the provider the row belongs to. */
  modelProviderSuffix: '，供应商 {provider}',
  /** {name} is the model and {provider} its provider; marks the current route. */
  currentModelLabel: '{name},供应商 {provider},当前使用中',
  /** `{name}` is the unreachable provider. */
  switchFailedTitle: '模型切换失败',
  switchFailedBody: '无法切换模型，请稍后重试。',
} as const
