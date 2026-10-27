/**
 * User-visible copy for the native client.
 *
 * The client ships one locale today. Copy lives here so that a screen reads as
 * layout plus a key, and so the full text inventory is one file rather than 928
 * scattered literals. Adding a second locale means adding a dictionary with the
 * same keys — `MessageKey` is derived from this one, so a missing translation
 * fails the typecheck instead of rendering blank.
 *
 * Keys are `<screen>.<role>`, where `<role>` names the thing rather than its
 * wording: `connect.addressLabel`, not `connect.desktopAddressLabel`.
 */

/** Every user-visible string the client renders. */
export const messages = {
  'common.cancel': '取消',
  'common.save': '保存',
  'common.retry': '请稍后重试。',

  'connect.title': '连接桌面端',
  'connect.failed': '连接桌面端失败，请检查地址和密码。',
  'connect.intro': '输入桌面端开启公网访问后显示的地址和密码，即可在任意网络下使用。',
  'connect.addressLabel': '桌面端地址',
  'connect.addressPlaceholder': 'https://example.trycloudflare.com',
  'connect.passwordLabel': '访问密码',
  'connect.passwordPlaceholder': '桌面端「手机访问」页显示的密码',
  'connect.submit': '连接',
  'connect.scanHint': '桌面上同时显示了配对二维码时，也可以扫码连接。',
  'connect.scanAction': '扫描配对二维码',
  'connect.openDrawer': '打开会话列表',
} as const

/** One key of {@link messages}. */
export type MessageKey = keyof typeof messages

/**
 * Resolve a message key.
 *
 * @param key - A key declared in {@link messages}.
 * @returns The copy for the active locale.
 */
export function t(key: MessageKey): string {
  return messages[key]
}
