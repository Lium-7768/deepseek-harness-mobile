/** Copy for whole-Turn folding: the control that stands in for a completed Turn. */

/** Turn fold copy. */
export const turn = {
  /** A Turn that finished without an error, when its duration is unknown. */
  worked: '已完成',
  /** A finished Turn with its duration; `{duration}` is `8分52秒`. */
  took: '已完成，用时 {duration}',
  /** A Turn the user stopped before it finished. */
  stopped: '已停止',
  /** A Turn that ended in an error. */
  failed: '处理失败',
  /** `{count}` seconds, printed with no space, as the desktop does. */
  seconds: '{count}秒',
  /** `{count}` minutes, printed with no space, as the desktop does. */
  minutes: '{count}分',
  /** `{count}` hours, printed after no space, as the desktop does. */
  hours: '{count}小时',
  /** Screen-reader label for the collapsed control. */
  expand: '展开本轮处理过程',
  /** Screen-reader label for the expanded control. */
  collapse: '收起本轮处理过程',
} as const
