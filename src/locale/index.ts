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
import { activity } from './activity'
import { attachment } from './attachment'
import { composer } from './composer'
import { connect } from './connect'
import { copy } from './copy'
import { conversation } from './conversation'
import { drawer } from './drawer'
import { errors } from './errors'
import { feedback } from './feedback'
import { interactions } from './interactions'
import { log } from './log'
import { markdown } from './markdown'
import { mode } from './mode'
import { model } from './model'
import { permission } from './permission'
import { plan } from './plan'
import { process as processCopy } from './process'
import { queue } from './queue'
import { rename } from './rename'
import { schedule } from './schedule'
import { scan } from './scan'
import { session } from './session'
import { settings as settingsCopy } from './settings'
import { speaker } from './speaker'
import { status } from './status'
import { subagent } from './subagent'
import { todo } from './todo'
import { tool } from './tool'
import { trajectory } from './trajectory'
import { turn } from './turn'
import { workbench } from './workbench'
import { workspace } from './workspace'

/** Copy shared by more than one screen. */
const common = {
  cancel: '取消',
  save: '保存',
  retry: '请稍后重试。',
  back: '返回',
  close: '关闭',
  continue: '继续',
  retryAction: '重试',
  reload: '重新加载',
  loading: '正在加载…',
  openDrawer: '打开会话列表',
  // Screen-reader suffixes appended to a control's own label.
  selectedSuffix: '，已选中',
  disabledSuffix: '，不可用',
  currentModelSuffix: '，当前模型',
} as const

const areas = {
  activity,
  attachment,
  common,
  composer,
  connect,
  conversation,
  drawer,
  errors,
  feedback,
  interactions,
  log,
  copy,
  markdown,
  mode,
  model,
  permission,
  plan,
  process: processCopy,
  queue,
  rename,
  scan,
  schedule,
  session,
  settings: settingsCopy,
  speaker,
  status,
  subagent,
  todo,
  tool,
  trajectory,
  turn,
  workbench,
  workspace,
}

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

/** Values substituted into a message that carries `{name}` placeholders. */
export type MessageValues = Record<string, string | number>

/**
 * Resolve a message and substitute its placeholders.
 *
 * Placeholders are `{name}`. A value the message does not name is ignored, and a
 * placeholder without a value is left in place so a missing value is visible in
 * the rendered copy instead of disappearing silently.
 *
 * @param key - A key declared in {@link messages}.
 * @param values - Values for the message's placeholders.
 * @returns The copy with placeholders replaced.
 */
export function format(key: MessageKey, values: MessageValues): string {
  return messages[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  )
}
