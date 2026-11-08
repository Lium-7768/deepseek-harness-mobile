import type { NativeIconName } from '@/components/native-icon'
import { NativeIcon } from '@/components/native-icon'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type Props = {
  /** Business glyph the row leads with while closed. */
  icon: NativeIconName
  /** Row title: the activity or tool verb, in the tertiary reading. */
  title: string
  /** Trailing one-line summary, after the dot separator; omitted reads as a bare title. */
  summary?: string
  open: boolean
  /** Whether the row opens a body; a bare row stays inert. */
  expandable?: boolean
  onToggle?: () => void
  /** Failure tone the desktop gives a failed call's summary. */
  tone?: 'tertiary' | 'danger'
  /** Accessible name for the disclosure, naming what it reveals. */
  accessibilityLabel: string
  /** The body the row reveals while open. */
  children?: React.ReactNode
}

/**
 * Renders one 24pt process row exactly as the desktop's `DisclosureRow` does.
 *
 * The leading glyph sits in a 16pt box with a 6pt gap, the title reads 13 on a
 * 24pt line, a 2×2 dot with 8pt margins separates the summary, and the summary
 * fills the rest of the line, ellipsized. Nothing trails the row: the desktop's
 * chevron is a hover affordance, so on a touch screen the leading glyph becomes
 * the chevron once the row is open.
 *
 * @param props - Glyph, title, summary, disclosure state, and the revealed body.
 * @returns The row and, while open, its body indented under the title.
 */
export function NativeFlowRow({
  accessibilityLabel,
  children,
  expandable = true,
  icon,
  onToggle,
  open,
  summary,
  title,
  tone = 'tertiary',
}: Props): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const interactive = expandable && onToggle !== undefined
  const glyph: NativeIconName = open ? 'chevron-up-outline' : icon
  const color = tone === 'danger' ? theme.colors.danger : theme.colors.inkTertiary
  const row = (
    <>
      <View style={s.leading}>
        <NativeIcon color={color} name={glyph} size={14} />
      </View>
      <Text numberOfLines={1} style={s.title}>
        {title}
      </Text>
      {summary === undefined || summary === '' ? null : (
        <>
          <View style={s.dot} />
          <Text numberOfLines={1} style={[s.summary, tone === 'danger' && s.danger]}>
            {summary}
          </Text>
        </>
      )}
    </>
  )
  return (
    <View style={s.root}>
      {interactive ? (
        <Pressable
          android_ripple={{ borderless: false }}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          hitSlop={{ top: 8, bottom: 8 }}
          onPress={onToggle}
          style={({ pressed }) => [s.row, pressed && s.pressed]}
        >
          {row}
        </Pressable>
      ) : (
        <View style={s.row}>{row}</View>
      )}
      {open && children !== undefined ? <View style={s.body}>{children}</View> : null}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { minWidth: 0 },
    // `DisclosureRow .row`: one 24pt line, tertiary reading.
    // `DisclosureRow.module.css`: the shared header is 24 tall (leading 16 + gap 8 +
    // title on its 24px line). The touch target comes from the caller's hitSlop, not
    // from a taller row.
    row: { alignItems: 'center', flexDirection: 'row', minHeight: 24, minWidth: 0 },
    // `DisclosureRow .leading`: a 16pt box holding a 14pt glyph, 6pt before the title.
    leading: { alignItems: 'center', height: 16, justifyContent: 'center', marginRight: 6, width: 16 },
    title: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 13, lineHeight: 24 },
    // `DisclosureRow .separator`: 2×2 dot, `label-caption`, 8pt either side.
    dot: { backgroundColor: theme.colors.inkFaint, borderRadius: 1, height: 2, marginHorizontal: 8, width: 2 },
    summary: { color: theme.colors.inkTertiary, flex: 1, fontSize: 13, lineHeight: 24, minWidth: 0 },
    danger: { color: theme.colors.danger },
    // `DisclosureRow .thinkBody`: the body indents under the title, past the glyph.
    // `ReasoningRow .body`: 4pt above and below, indented past the 16pt leading box.
    body: { gap: 8, paddingBottom: 4, paddingLeft: 22, paddingTop: 4 },
    pressed: { opacity: 0.62 },
  })
