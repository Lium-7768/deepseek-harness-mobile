import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { textStyle } from '@/theme/text'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

/** One selectable menu row: a glyph, a label, and its optional detail. */
export interface NativeMenuOption {
  value: string
  label: string
  /** Monospace slash token printed beside the label (`ui-commands` rows). */
  token?: string
  description?: string
  /** Overrides the default check glyph; permission presets draw their own shield. */
  icon?: NativeIconName
  selected?: boolean
  disabled?: boolean
  /** Shows a spinner in place of the selected check while the write settles. */
  busy?: boolean
}

/** One menu group: an optional heading above its rows. */
export interface NativeMenuGroup {
  title?: string
  options: NativeMenuOption[]
}

/** A one-line state under the menu's heading (loading, locked, or failed). */
export interface NativeMenuNotice {
  text: string
  tone?: 'error' | 'muted'
}

/**
 * Renders one composer trigger's menu.
 *
 * Every trigger in the composer's control row and dock opens this same surface:
 * the Web's menu skin (r12, menu fill, prominent elevation) holding an optional
 * notice, an optional heading, and radio rows whose selected state is a trailing
 * check. One interaction for permission, mode, model, statistics, usage, context,
 * and add — a phone has no room for the Web's anchored popovers, so each one
 * opens here instead.
 *
 * @param props - Whether the menu is open, how to close it, and its content.
 * @returns The menu, or `null` while closed.
 */
export function NativeMenuPanel({
  groups,
  notice,
  onClose,
  onSelect,
  open,
  rowRole = 'menu',
  actionMenu = false,
  title,
}: {
  groups: NativeMenuGroup[]
  notice?: NativeMenuNotice
  onClose: () => void
  onSelect?: (value: string) => void
  open: boolean
  /**
   * Which row typography the surface carries. `menu` is the command menu's
   * 13/20 label, `select` the 14/22 label the Web prints in its select lists
   * (permission, mode, model), where the current value sits in the same size.
   */
  rowRole?: 'menu' | 'select'
  actionMenu?: boolean
  title?: string
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  if (!open) return null
  const rows = groups.reduce((count, group) => count + group.options.length, 0)
  return (
    <NativeAnchoredPanel onClose={onClose} open>
      <View style={s.menu}>
        {title === undefined ? null : <Text style={s.title}>{title}</Text>}
        {notice === undefined ? null : (
          <Text style={[s.notice, notice.tone === 'error' && s.noticeError]}>{notice.text}</Text>
        )}
        {rows === 0 && notice === undefined ? <Text style={s.notice}>{message('common.loading')}</Text> : null}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll} style={s.list}>
          {groups.map((group, groupIndex) => (
            <View key={group.title ?? `group-${groupIndex}`} style={s.group}>
              {group.title === undefined ? null : <Text style={s.groupTitle}>{group.title}</Text>}
              {group.options.map((option) => (
                <Pressable
                  android_ripple={{ borderless: false }}
                  accessibilityLabel={`${option.label}${option.selected === true ? message('common.selectedSuffix') : ''}${option.disabled === true ? message('common.disabledSuffix') : ''}`}
                  accessibilityRole={actionMenu ? 'button' : 'radio'}
                  accessibilityState={{
                    ...(actionMenu ? {} : { checked: option.selected === true }),
                    disabled: option.disabled === true,
                  }}
                  disabled={option.disabled === true}
                  key={option.value}
                  onPress={() => {
                    onClose()
                    onSelect?.(option.value)
                  }}
                  style={({ pressed }) => [
                    s.row,
                    option.selected === true && s.rowSelected,
                    option.disabled === true && s.rowDisabled,
                    pressed && s.rowPressed,
                  ]}
                >
                  {option.icon === undefined ? null : (
                    <NativeIcon
                      name={option.icon}
                      size={16}
                      color={option.selected === true ? theme.colors.accentText : theme.colors.inkMuted}
                    />
                  )}
                  <View style={s.rowText}>
                    <View style={s.rowTitle}>
                      <Text numberOfLines={1} style={[s.rowLabel, rowRole === 'select' && s.rowLabelSelect]}>
                        {option.label}
                      </Text>
                      {option.token === undefined ? null : <Text style={s.rowToken}>{option.token}</Text>}
                    </View>
                    {option.description === undefined ? null : (
                      <Text
                        numberOfLines={2}
                        style={[s.rowDescription, rowRole === 'select' && s.rowDescriptionSelect]}
                      >
                        {option.description}
                      </Text>
                    )}
                  </View>
                  {option.busy === true ? (
                    <ActivityIndicator color={theme.colors.inkFaint} />
                  ) : option.selected === true ? (
                    <NativeIcon name="check-outline" size={16} color={theme.colors.accentText} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </NativeAnchoredPanel>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `ui-primitives Menu`: menu fill, r12, prominent elevation.
    menu: {
      maxHeight: 480,
      flexShrink: 1,
      minHeight: 0,
      paddingHorizontal: 6,
      paddingVertical: 8,
    },
    title: {
      color: theme.colors.ink,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 22,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    notice: { ...textStyle(theme, 'caption', 'tertiary'), paddingHorizontal: 8, paddingVertical: 6 },
    noticeError: { color: theme.colors.danger },
    list: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
    scroll: { gap: 2, paddingBottom: 2 },
    group: { gap: 2 },
    groupTitle: { ...textStyle(theme, 'label', 'tertiary'), paddingHorizontal: 8, paddingVertical: 4 },
    // `Menu.module.css .item`: r8 rows, 13/20 title, 12/18 caption description.
    row: {
      alignItems: 'center',
      borderRadius: theme.radius.sm,
      flexDirection: 'row',
      gap: 8,
      minHeight: 44,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    rowSelected: { backgroundColor: theme.colors.floatingHover },
    rowPressed: { opacity: 0.62 },
    rowTitle: { alignItems: 'baseline', flexDirection: 'row', gap: 8, minWidth: 0 },
    rowText: { flex: 1, minWidth: 0 },
    // `ui-commands` prints the slash token in the tertiary tone beside the label.
    rowToken: textStyle(theme, 'label', 'tertiary'),
    rowLabel: { ...textStyle(theme, 'body'), flexShrink: 1 },
    // The Web's select lists (`PermissionSelect`, `ModeSelect`, `ModelSelect`)
    // print the row label and its current value at 14/22, one step above the
    // command menu's 13/20 rows.
    rowLabelSelect: textStyle(theme, 'paragraph'),
    // `.item:disabled` dims the whole row to 0.4 and keeps the label on
    // label-primary, so a locked option still outranks its own description.
    rowDisabled: { opacity: 0.4 },
    rowDescription: textStyle(theme, 'caption', 'tertiary'),
    rowDescriptionSelect: textStyle(theme, 'paragraph', 'tertiary'),
  })
