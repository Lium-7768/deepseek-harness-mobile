/**
 * Copy for the settings screen: section titles, the model and permission
 * summaries, plugin groups, and the connection panel.
 *
 * The screen edits only what the desktop marks writable, so several strings
 * explain why a control is disabled rather than naming the control itself.
 */

/** Settings screen copy. */
export const settings = {
  title: '设置',
  subtitle: '管理桌面端运行时和移动端连接',

  sectionGeneral: '通用设置',
  sectionModels: '模型',
  sectionPlugins: '插件',
  sectionPresets: '智能体预设',

  savedTitle: '设置已保存',
  saveFailedTitle: '设置保存失败',
  saveFailedBody: '无法保存设置，请稍后重试。',
  loadFailed: '设置加载失败，请稍后重试。',
  mobileScopeNote: '移动端只修改桌面端明确允许的设置；敏感配置仍由桌面端管理。',
  readOnlyProvider: '桌面端设置提供方为只读，修改控件已禁用。',

  builtinMode: '内置模式',
  customMode: '自定义模式',
  modeAppliesToNewSessions: '之后创建的会话将使用此模式。',
  noPresetsConfigured: '桌面端未配置智能体预设。',
  noPresets: '桌面端没有可用的智能体预设。',
  customPresetsUnsupported: '当前部署不支持在移动端创建自定义预设。',
  presetsLoadFailed: '智能体预设加载失败，请稍后重试。',
  presetReadOnly: '只读查看预设内容。',
  presetEmpty: '预设内容为空。',
  /** `{name}` is the preset's display name or id. */
  viewPreset: '查看 {name}',
  isDefaultSuffix: '（默认）',

  permissionReadOnly: '新会话默认使用只读权限。',
  permissionWorkspace: '新会话默认使用工作区写入权限。',
  permissionFull: '新会话默认使用完全访问权限。',

  defaultModel: '新会话默认模型',
  modelSavedTitle: '默认模型已保存',
  modelSaveFailedTitle: '默认模型保存失败',
  modelSaveFailedBody: '无法保存默认模型，请稍后重试。',
  modelAppliesToNewSessions: '之后创建的会话将使用此模型。',
  modelScopeNote: '仅影响之后创建的会话。会话中的模型可在输入框底部单独切换。',
  modelsLoadFailed: '模型目录加载失败，请稍后重试。',
  defaultModelLoadFailed: '默认模型加载失败，请稍后重试。',
  noModels: '当前没有可用模型。',
  modelManagedByDesktop: '默认模型由桌面端配置提供方管理，当前不可在移动端修改。',

  effectRestart: '重启生效',
  effectLive: '实时生效',
  noPlugins: '桌面端没有可展示的插件配置。',

  groupDeepseekModels: 'DeepSeek 模型',
  groupPiAiModels: 'Pi AI 模型',
  groupDeepseekSearch: 'DeepSeek 网页搜索',
  groupTerminal: '终端',
  groupAgentLoop: '智能体循环',

  themeDark: '深色（桌面端）',
  themeSystem: '跟随系统（桌面端）',
  themeLight: '浅色（桌面端）',

  connectionSection: '桌面端连接',
  connected: '已连接',
  disconnected: '未连接',
  gateway: '移动网关',
  deviceId: '设备 ID',
  /** `{deviceId}` is the paired device's identifier. */
  deviceIdValue: '设备 ID：{deviceId}',
  deviceIdNone: '设备 ID：未连接',
  forgetTitle: '忘记此桌面端？',
  forgetBody: '这只会移除手机上的凭据。如需阻止后续访问，请在桌面端撤销设备。',
  forget: '忘记',
  forgetFailedTitle: '忘记连接失败',
  forgetFailedBody: '无法移除本机凭据，请稍后重试。',

  fullAccessTitle: '启用完全访问？',
  fullAccessBody: '这会让之后创建的会话不受工作区范围限制地访问文件。',

  /** Loading placeholders, one per panel. */
  loading: '正在加载设置…',
  loadingModels: '正在加载模型目录…',
  loadingPlugins: '正在读取插件配置…',
  loadingPresets: '正在加载智能体预设…',
  loadingPresetBody: '正在读取预设…',

  /** Section entry copy on the settings index. */
  generalDescription: '默认模式、权限和桌面端行为',
  modelsDescription: '查看提供方与模型目录；API 密钥需在桌面端维护',
  pluginsDescription: '移动端仅查看，插件安装和配置需在桌面端完成',
  presetsDescription: '查看预设，并为仍为空白的会话选择模式',

  modeSectionTitle: '新会话默认智能体模式',
  modeSectionDescription: '仅影响之后创建的会话。运行中的会话不会改变。',
  permissionSectionTitle: '默认权限',
  permissionSectionDescription: '仅影响之后创建的会话；当前会话的权限请求仍需逐项审批。',
  permissionReadOnlyLabel: '只读',
  permissionReadOnlyDetail: '禁止写入工作区',
  permissionWorkspaceLabel: '工作区写入',
  permissionWorkspaceDetail: '允许在工作区内写入文件',
  permissionFullLabel: '完全访问',
  permissionFullDetail: '不限制工作区访问范围',

  appearance: '外观',
  appearanceDetail: '移动端当前固定浅色主题；请在桌面端修改主题。',
  language: '语言',
  languageValue: '中文',
  languageDetail: '移动端当前提供中文界面；桌面端语言设置不会改变移动端文案。',
  enterBehavior: '忙碌时 Enter 键行为',
  enterBehaviorValue: '排队发送',
  enterBehaviorDetail: '移动端发送按钮不提供桌面端 Enter 行为切换。',

  modelDirectoryUnavailable: '{name}：目录暂不可用。',
  providers: '提供方与 API 密钥',
  desktopOnly: '桌面端专属',
  providersDetail: '移动端不会接收或保存 API 密钥，也不开放任意提供方配置。',

  pluginsLoadFailed: '插件配置加载失败，请稍后重试。',
  pluginsReadOnlyNote: '移动端不安装、卸载或任意修改插件。下列配置命名空间仅用于确认桌面端已加载的能力。',
  namespacesTitle: '桌面端配置命名空间',
  namespacesDescription: '插件的完整配置表单和敏感字段只在桌面端提供。',
  pluginManagement: '插件管理',
  pluginManagementDetail: '移动端没有可点击但不生效的插件管理入口。',

  presetReadFailed: '预设读取失败，请稍后重试。',
  editPreset: '编辑此预设',
  editPresetDetail: '移动端不打开或修改本地预设文件。',
  presetsIntro: '预设决定会话使用的工具和能力。点击可查看内容；新会话默认值在通用设置中修改。',

  forgetAction: '忘记此桌面端',
  backToSettings: '返回设置',
} as const
