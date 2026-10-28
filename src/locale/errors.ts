/**
 * Failure copy the API client surfaces.
 *
 * Every message states what failed and what the user can do next. The gateway
 * error codes map onto these; a code without a message falls back to
 * `requestFailed` so the user never sees raw gateway text.
 */

/** Failure copy raised by the API client. */
export const errors = {
  requestFailed: '移动端请求失败，请稍后重试。',
  requestInvalid: '移动端请求无效，请重试。',
  /** `{status}` is the HTTP status the gateway answered with. */
  httpFailed: '移动端连接请求失败（HTTP {status}），请稍后重试。',
  gatewayInvalid: '移动网关地址无效，请检查连接设置。',
  gatewayProtocol: '移动网关地址必须使用 HTTP 或 HTTPS。',
  network: '无法连接桌面端，请检查网络或网关地址。',
  responseInvalid: '桌面端返回了无效响应，请稍后重试。',
  credentials: '移动端凭据无效，请重新连接桌面端。',
  notFound: '未找到请求的会话或操作。',
  desktopUnavailable: '桌面端当前不可用，请确认桌面端正在运行。',

  qrGatewayInvalid: '二维码中的桌面网关地址无效。',
  pairingExpired: '该配对二维码已过期，请在桌面端重新生成。',
  pairingInvalid: '该配对二维码无效、已使用或已过期，请在桌面端重新生成。',
  pairingUnreachable: '无法连接桌面端，请确认二维码对应的网络地址可访问。',
  pairingResponseInvalid: '桌面端返回了无效的配对响应。',

  addressInvalid: '请输入有效的桌面端地址，例如 https://example.trycloudflare.com。',
  passwordRequired: '请输入桌面端显示的访问密码。',
  addressUnreachable: '无法连接桌面端，请确认地址可访问且桌面端已开启公网访问。',
  loginResponseInvalid: '桌面端返回了无效的登录响应。',

  modelUnavailable: '所选模型当前不可用，请重新选择。',
  agentModeLocked: '会话已经开始，无法切换 Agent 模式。',
  agentPresetNotFound: '未找到所选 Agent 预设。',
  agentPresetLocked: '所选 Agent 预设当前不可用。',
  settingsRejected: '设置未被桌面端接受，请检查输入。',
  settingsConflict: '设置已被其他窗口修改，请重新加载后再试。',
} as const
