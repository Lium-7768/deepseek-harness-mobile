/**
 * Copy for the message composer: the editor placeholder, attachment pickers and
 * their permission failures, the send and stop actions, and the permission,
 * mode, and model triggers.
 */

/** Composer copy. */
export const composer = {
  placeholder: '给智能体发消息',
  inputLabel: '消息输入',

  addImage: '添加图片',
  addImageDetail: '拍照和照片库中的图片都会在上传前压缩。',
  takePhoto: '拍照',
  choosePhoto: '从照片库选择',
  /** `{count}` draft images currently attached. */
  imagesAdded: '已添加 {count} 张图片',
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
  imageLimitTitle: '最多可添加 4 张图片',
  imageLimitBody: '添加图片附件',

  send: '发送消息',
  sending: '正在发送消息',
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
