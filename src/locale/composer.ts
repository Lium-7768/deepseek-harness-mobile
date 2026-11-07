/**
 * Copy for the message composer: the editor placeholder, attachment pickers and
 * their permission failures, the send and stop actions, and the permission,
 * mode, and model triggers.
 */

/** Composer copy. */
export const composer = {
  switching: '正在切换会话配置…',
  // `ui-conversation` `placeholder.default`, printed by the in-session composer.
  placeholder: '发消息或创建任务…',
  // `placeholder.hero`, printed by the workspace hero whose empty state still
  // describes what to build.
  heroPlaceholder: '描述你想要构建的内容…',
  inputLabel: '消息输入',

  // The Web's add control carries `input.commands` and opens one menu of files
  // and slash commands (`ui-commands`).
  addContent: '添加图片或选择操作',
  menuAddSection: '添加',
  menuFile: '文件',
  menuFileDetail: '图片附件，最长边缩放到 1600 像素后上传',
  menuCommandSection: '指令',
  menuGoal: '目标',
  menuGoalDetail: '设置或查看长期任务目标',
  menuPermission: '权限',
  menuPermissionDetail: '切换权限预设（沙箱模式与审批策略）',
  menuMode: '模式',
  menuModeDetail: '切换智能体模式',
  menuModel: '模型',
  menuModelDetail: '选择本会话使用的模型',
  addImage: '添加图片',
  addImageDetail: '图片会在本机缩到最长边 1600 像素再上传。',
  takePhoto: '拍照',
  choosePhoto: '从照片库选择',
  /** `{count}` draft images currently attached; `{size}` is their encoded total. */
  imagesAdded: '已添加 {count} 张图片，共 {size}',
  imageSkippedTitle: '部分图片未添加',
  /** `{count}` skipped images and the `{limit}` the draft may carry in total. */
  imageSkippedBody: '有 {count} 张图片超出单条消息的附件上限（共 {limit}），已跳过。可以少选几张再发。',
  /** `{index}` is 1-based, matching the remove button's label. */
  attachmentImage: '附件图片 {index}',
  removeAttachment: '移除附件图片 {index}',
  imageAddFailedTitle: '无法添加图片',
  imageAddFailedBody: '所选图片未提供可上传的数据，请重新选择。',
  photoLibraryFailedTitle: '无法打开照片库',
  photoLibraryFailedBody: '请检查照片权限后重试。',
  cameraPermissionTitle: '需要相机权限',
  cameraPermissionBody: '请允许 DeepSeek Harness 使用相机后再拍照。',
  cameraFailedTitle: '无法打开相机',
  cameraFailedBody: '请检查相机权限后重试。',

  send: '发送消息',
  /** Primary control while the agent runs and a draft is waiting. */
  sendQueue: '排队发送',
  sendSteer: '插话发送',
  sending: '正在发送消息',
  /** Stands in for the placeholder while the stream is down and nothing is drafted. */
  offlinePlaceholder: '连接已断开，恢复后可发送',
  /** Names the disabled send control while the stream is down. */
  offlineSendLabel: '连接已断开，无法发送',
  stop: '停止当前任务',
  stopping: '正在停止当前任务',

  /** `{label}` is the current permission preset's name. */
  selectPermission: '选择权限：{label}',
  permissionLocked: '工作区写入权限由桌面端控制',
  /** `{label}` is the current agent mode's name. */
  selectMode: '选择智能体模式：{label}',
  modeNeedsSession: '智能体模式需先选择会话',
  /** `{label}` is the current model's name. */
  selectModel: '选择模型：{label}',
  modelNeedsSession: '模型需先选择会话',
  modelLocked: '模型由桌面端控制',
} as const
