/**
 * Copy for the sign-in screen.
 *
 * The screen takes the two values the desktop publishes: its public address and
 * the password it currently accepts. The QR entry stays as a secondary route for
 * a desktop that also shows a pairing code.
 */

/** Sign-in screen copy. */
export const connect = {
  /** Bar shown on every screen while the event stream is down. */
  offline: '已断开桌面连接',
  title: '连接桌面端',
  intro: '输入桌面端开启公网访问后显示的地址和密码，即可在任意网络下使用。',
  addressLabel: '桌面端地址',
  addressPlaceholder: 'https://example.trycloudflare.com',
  passwordLabel: '访问密码',
  passwordPlaceholder: '桌面端「手机访问」页显示的密码',
  submit: '连接',
  scanAction: '扫描配对二维码',
  failed: '连接桌面端失败，请检查地址和密码。',
} as const
