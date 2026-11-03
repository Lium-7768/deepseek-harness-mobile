/**
 * Copy for the session drawer: the new-session action, workspace groups, the
 * search panel, per-row menus, and the failure alerts those actions raise.
 */

/** Session drawer copy. */
export const drawer = {
  plugins: '插件',
  automations: '自动化任务',
  more: '更多',
  restore: '恢复会话',
  restoreFailed: '恢复会话失败',
  newSession: '新会话',
  connectFirst: '请先连接桌面端',
  /** The sentence form, used where the copy is not a control label. */
  connectFirstBody: '请先连接桌面端。',

  workspaces: '工作区',
  sessions: '会话',
  collapseOptions: '收起分组和排序选项',
  expandOptions: '展开分组和排序选项',
  groupByWorkspace: '按工作区',
  groupByWorkspaceTree: '按工作区树',
  manualOrder: '手动排序',
  filterSessions: '筛选会话',
  hideArchived: '隐藏已归档',
  showArchived: '全部对话（显示已归档）',
  onlyArchived: '仅显示已归档',
  archived: '已归档',
  archivedNotOpenable: '该会话已归档，请先恢复后再打开。',
  moveUp: '上移',
  moveDown: '下移',
  singleList: '单列表',
  groupByWorkspaceUngrouped: '按工作区（仅未分组）',
  manualOrderUnsupported: '手动排序（暂不支持）',

  sessionsLoadFailed: '会话加载失败，请稍后重试。',
  searching: '正在搜索会话历史…',
  searchFailed: '搜索会话内容失败，请稍后重试。',
  noSearchResults: '无匹配会话',
  searchTooManyResults: '结果较多，请使用更具体的关键词。',
  noSessions: '暂无会话。',

  collapseSession: '收起会话',
  collapse: '收起',
  expand: '展开',

  archiveSession: '归档会话',
  archive: '归档',
  removeWorkspace: '移除工作区',
  remove: '移除',

  newSessionFailedTitle: '新建会话失败',
  forkFailedTitle: '分叉会话失败',
  archiveFailedTitle: '归档会话失败',
  removeWorkspaceFailedTitle: '移除工作区失败',

  removeWorkspaceBody: '“{title}”将不再显示为分组；桌面文件夹和所有会话记录不会被删除。',
  removeWorkspaceDetail: '保留桌面文件夹和会话记录',
  archiveSessionBody: '“{title}”将从桌面和手机的活动会话列表中移除。',

  close: '关闭会话列表',
  searchSessions: '搜索会话',
  searchPlaceholder: '搜索会话名称',
  clearSearch: '清除搜索',
  addWorkspaceDesktopOnly: '添加工作区（桌面端专属）',
  viewSettings: '会话视图设置',
  groupBy: '分组方式',
  sortBy: '排序方式',
  recentlyUpdated: '最近更新',
  workspaceActions: '工作区操作',
  sessionActions: '会话操作',
  /** `{title}` names the session whose action menu opens. */
  sessionActionsFor: '{title} 的操作',
  renameWorkspace: '重命名工作区',
  rename: '重命名',
  forkSession: '分叉会话',
  openSettings: '打开设置',
  syncSessions: '同步会话状态',
  expandMore: '展开其余 {count} 个会话',
  openSession: '打开会话 {title}',
} as const
