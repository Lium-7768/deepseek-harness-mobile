/** Copy for whole-Turn folding: the control that stands in for a completed Turn. */

/** Turn fold copy. */
export const turn = {
  /** A Turn that finished without an error, when its duration is unknown. */
  worked: '已完成',
  /** Prefix printed ahead of the monospace duration parts. */
  tookPrefix: '已完成，用时',
  /** A finished Turn with its duration; `{duration}` is `8分52秒`. */
  took: '已完成，用时 {duration}',
  /** A Turn the user stopped before it finished. */
  stopped: '已停止',
  /** A Turn that ended in an error. */
  failed: '处理失败',
  secondUnit: '秒',
  minuteUnit: '分',
  hourUnit: '小时',
  /** Screen-reader label for the collapsed control. */
  expand: '展开本轮处理过程',
  /** Screen-reader label for the expanded control. */
  collapse: '收起本轮处理过程',
} as const
