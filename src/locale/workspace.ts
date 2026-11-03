/**
 * Copy for the workspace hero: the selected-session summary, the composer's
 * guard messages, and the status line under the header.
 */

/** Workspace screen copy. */
export const workspace = {
  sectionTitle: '工作区',
  /** The empty new-session hero, matching the desktop's own headline. */
  heroTitle: '探索未至之境',
  /** Badge beside the hero headline; the desktop shows it on preview builds. */
  heroBadge: '预览版',
  pickSession: '选择会话',
  pickSessionFirst: '请先选择一个会话后再发送。',
  selectedSessionLabel: '选择桌面会话',
  currentSession: '当前会话',
  /** `{title}` is the selected session's display title. */
  currentSessionNamed: '当前会话：{title}',

  /** `{label}` is the mode name a new session will start with. */
  presetModeTrigger: '设置新会话默认模式：{label}',
  /** `{label}` is the current agent mode's name. */
  selectMode: '选择智能体模式：{label}',

  connectFirst: '请先连接桌面端。',
  pickDesktopSession: '请先选择一个桌面会话。',
  loading: '正在加载桌面工作区…',
  /** `{reason}` is the failure the API client reported. */
  loadFailed: '桌面工作区加载失败：{reason}',
  empty: '桌面端暂无会话，请在桌面端创建会话。',
  /** `{count}` sessions on the desktop. */
  connected: '已连接桌面端 · {count} 个会话',
  /** `{time}` is the most recent update, already formatted. */
  recentlyUpdated: '最近更新 · {time}',
} as const
