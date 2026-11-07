/**
 * Copy for the settings screen: section titles, the model and permission
 * summaries, plugin groups, and the connection panel.
 *
 * The screen edits only what the desktop marks writable, so several strings
 * explain why a control is disabled rather than naming the control itself.
 */

/** Settings screen copy. */
export const settings = {
  fieldAccessibilityLabel: '{label}：{value}',
  title: '设置',

  /** Desktop order -10, ahead of every other section. */
  sectionAccount: '账号与余额',
  sectionGeneral: '通用设置',
  sectionConnection: '桌面端连接',
  sectionModels: '模型',
  sectionPlugins: '内置插件',
  sectionPresets: 'Agent 预设',

  savedTitle: '设置已保存',
  saveFailedTitle: '设置保存失败',
  saveFailedBody: '无法保存设置，请稍后重试。',
  loadFailed: '设置加载失败，请稍后重试。',
  mobileScopeNote: '移动端只修改桌面端明确允许的设置；敏感配置仍由桌面端管理。',
  readOnlyProvider: '桌面端设置提供方为只读，修改控件已禁用。',

  currentVersion: '当前版本：{version}',

  builtinMode: '内置模式',
  customMode: '自定义模式',
  modeStandardDetail: '处理代码、文件和资料，适合大多数任务。Agent 会按需使用检索、编辑和终端等工具。',
  modePtcDetail: '包含标准模式的所有能力，更适合批量调用工具，并对结果进行筛选、整理、去重、统计或汇总的任务。',
  modeMinimalDetail: 'Agent 使用终端和图片读取工具，并支持上下文压缩，适合测试和对比其基础表现。',
  modeCreativeDetail: '用对话定制 DSH：让 Agent 编写插件，添加新功能或界面；也能组合工具和提示词，创建自己的模式。',
  modeAppliesToNewSessions: '之后创建的会话将使用此模式。',
  noPresetsConfigured: '桌面端未配置智能体预设。',
  noPresets: '桌面端没有可用的智能体预设。',
  customPresetsUnsupported: '当前部署不支持在移动端创建自定义预设。',
  presetsLoadFailed: '智能体预设加载失败，请稍后重试。',
  presetReadOnly: '只读查看预设内容。',
  presetEmpty: '预设内容为空。',
  /** `{name}` is the preset's display name or id. */
  viewPreset: '查看 {name}',
  /** Pill on the preset a new session starts with. */
  defaultTag: '新任务默认',
  /** Pill on a preset the product ships rather than the user authoring. */
  shippedTag: '内置',

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

  themeDark: '深色',
  themeSystem: '跟随系统',
  themeLight: '浅色',

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

  modeSectionTitle: '新会话默认智能体模式',
  modeSectionDescription: '仅影响之后创建的会话。运行中的会话不会改变。',
  permissionSectionTitle: '默认权限',
  permissionSectionDescription: '仅影响之后创建的会话；当前会话的权限请求仍需逐项审批。',
  permissionReadOnlyLabel: '只读',
  permissionWorkspaceLabel: '工作区写入',
  permissionFullLabel: '完全访问',

  appearance: '外观',
  appearanceDetail: '选择手机端的显示外观，或跟随系统设置。',
  appearanceSaved: '外观已更新。',
  appearanceLight: '浅色',
  appearanceDark: '深色',
  appearanceSystem: '跟随系统',
  language: '语言',
  languageValue: '中文',
  languageDetail: '移动端当前提供中文界面；桌面端语言设置不会改变移动端文案。',
  enterBehavior: '忙碌时的发送行为',
  enterBehaviorQueue: '排队发送',
  enterBehaviorSteer: '插话发送',
  enterBehaviorDetail: '智能体运行时发送消息的方式：排队等当前回合结束，或插话打断当前回合。',
  enterBehaviorSaved: '发送行为已更新',

  modelDirectoryUnavailable: '{name}：目录暂不可用。',
  providers: '提供方与 API 密钥',
  desktopOnly: '桌面端专属',
  providersDetail: '移动端不会接收或保存 API 密钥，也不开放任意提供方配置。',

  pluginsLoadFailed: '插件配置加载失败，请稍后重试。',
  pluginsReadOnlyNote: '移动端不安装、卸载或任意修改插件。下列配置命名空间仅用于确认桌面端已加载的能力。',
  searchPlugins: '搜索插件',
  noPluginMatches: '没有匹配的插件。',
  namespacesTitle: '桌面端配置命名空间',
  namespacesDescription: '插件的完整配置表单和敏感字段只在桌面端提供。',
  pluginManagement: '插件管理',
  pluginManagementDetail: '移动端没有可点击但不生效的插件管理入口。',

  presetReadFailed: '预设读取失败，请稍后重试。',
  editPreset: '编辑此预设',
  editPresetDetail: '移动端不打开或修改本地预设文件。',
  // `sectionIntro` and `builtInGroup` from ui-agent-preset's locale: the Web's
  // Agent 预设 tab describes the presets themselves, then groups the shipped
  // ones under 内置.
  presetsIntro: '选择 Agent 的工具和工作方式。日常任务用「标准模式」，扩展 DSH 的能力用「创造模式」。',
  presetsBuiltInGroup: '内置',
  // The desktop's preset card footer and the opening paragraph of its 如何使用
  // guide; the mobile dialog shows that paragraph instead of the full guide.
  presetExplanation: '模式说明',
  presetHowToUse: '如何使用',
  presetGuideStandard: '新建任务时选择「标准模式」，说明要完成什么、相关文件在哪里，以及怎样判断任务完成。',
  presetGuidePtc: '新建任务时选择「PTC 模式」，说明输入文件、处理规则和输出格式。代码由 Agent 编写。',
  presetGuideMinimal: '新建任务时选择「极简模式」。做对照测试时，保持模型、权限、任务输入和工作区起始状态一致。',
  presetGuideCordis: '新建任务时选择「创造模式」，说明希望增加什么能力、从哪里使用，以及怎样验证效果。',

  forgetAction: '忘记此桌面端',
  backToSettings: '返回设置',
  close: '关闭设置',

  accountReadOnly: '只读：登录、退出与奖励领取请在桌面端操作。',
  accountSignedOut: '桌面端尚未登录 DeepSeek 账号。',
  accountName: '账号名称',
  accountNameMissing: '未提供',
  accountContact: '联系方式',
  accountContactMissing: '未提供',
  accountAvatar: '头像',
  accountSynced: '已同步',
  accountBalance: '余额',
  accountBalanceEmpty: '暂无余额记录',
  accountBonus: '赠送额度',
} as const
