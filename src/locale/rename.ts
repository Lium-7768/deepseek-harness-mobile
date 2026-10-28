/**
 * Copy for the two rename screens. They share the failure and save wording; the
 * noun differs.
 */

/** Rename screens copy. */
export const rename = {
  sessionTitle: '重命名会话',
  sessionLabel: '会话标题',
  sessionPlaceholder: '输入会话标题',
  sessionNote: '标题会同步到桌面 Web 的同一会话。',
  sessionMissing: '请先连接桌面端并从会话列表打开会话。',
  sessionEmpty: '会话标题不能为空。',

  workspaceTitle: '重命名工作区',
  workspaceLabel: '工作区名称',
  workspacePlaceholder: '输入工作区名称',
  workspaceNote: '工作区名称会同步到桌面 Web 的同一分组，不会移动或修改桌面文件夹。',
  workspaceMissing: '请先连接桌面端并从工作区列表打开。',
  workspaceEmpty: '工作区名称不能为空。',
  backToWorkspace: '返回工作区',

  save: '保存',
  failedTitle: '重命名失败',
} as const
