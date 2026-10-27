/**
 * User-visible copy for the native client.
 *
 * Copy is split by area so a screen group's text sits together, and merged here
 * into one keyed map. `MessageKey` is derived from the merged map, so a screen
 * that asks for a key nothing declares fails the typecheck instead of rendering
 * blank, and a second locale cannot silently miss one.
 *
 * Keys are `<area>.<role>`, where `<role>` names the thing rather than its
 * wording: `connect.addressLabel`, not `connect.desktopAddressLabel`.
 */
import { connect } from './connect'
import { errors } from './errors'

/** Copy shared by more than one screen. */
const common = {
  cancel: '取消',
  save: '保存',
  retry: '请稍后重试。',
  back: '返回',
  openDrawer: '打开会话列表',
  // Screen-reader suffixes appended to a control's own label.
  selectedSuffix: '，已选中',
  disabledSuffix: '，不可用',
  currentModelSuffix: '，当前模型',
} as const

const areas = { common, connect, errors }

/** Every user-visible string the client renders, keyed as `<area>.<role>`. */
export const messages = Object.fromEntries(
  Object.entries(areas).flatMap(([area, entries]) =>
    Object.entries(entries).map(([role, copy]) => [`${area}.${role}`, copy]),
  ),
) as { [K in keyof typeof areas as `${K & string}.${keyof (typeof areas)[K] & string}`]: string }

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
