import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeIcon } from '@/components/native-icon'
import type { SessionStatisticPanel, SessionStatisticsPill } from '@/components/session-stats-logic'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { FIXED_GEOMETRY_FONT_CAP } from '@/theme/text-scale'
import { textStyle } from '@/theme/text'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

/**
 * Renders one dock statistics pill and its click-open detail panel.
 *
 * `StatsPills` prints a 22-tall chip holding the glyph and the readings; the
 * press opens `stat-dialog.module.css`'s panel: a heading row with the section
 * name left and its headline value right over a hairline rule, then `dt`/`dd`
 * rows in the tertiary tone with right-aligned tabular values.
 *
 * @param props - The pill, the panel behind it, and that panel's heading value.
 * @returns The pill, and its panel while open.
 */
export function NativeStatisticsPill({
  headline,
  panel,
  pill,
}: {
  /** Headline figure printed opposite the panel's section name. */
  headline: string
  /** Panel content, or `undefined` when the pill has no detail to show. */
  panel: SessionStatisticPanel | undefined
  pill: SessionStatisticsPill
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [open, setOpen] = useState(false)
  const interactive = panel !== undefined
  return (
    <>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={pill.label}
        accessibilityRole="button"
        accessibilityState={{ expanded: interactive && open }}
        disabled={!interactive}
        hitSlop={{ top: 11, bottom: 11 }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [s.pill, open && s.pillOpen, pressed && interactive && s.pressed]}
      >
        <NativeIcon name={pill.glyph} size={14} color={theme.colors.inkTertiary} />
        <Text maxFontSizeMultiplier={FIXED_GEOMETRY_FONT_CAP} numberOfLines={1} style={s.text}>
          {pill.label}
        </Text>
      </Pressable>
      <NativeAnchoredPanel onClose={() => setOpen(false)} open={interactive && open}>
        {panel === undefined ? null : (
          <ScrollView contentContainerStyle={s.panel} style={s.scroll}>
            <View style={s.title}>
              <View style={s.titleLabel}>
                <NativeIcon name={pill.glyph} size={14} color={theme.colors.ink} />
                <Text style={s.titleText}>{panel.title}</Text>
              </View>
              <Text style={s.titleValue}>{headline}</Text>
            </View>
            <View style={s.titleRule} />
            <View style={s.details}>
              {panel.rows.map((row) => (
                <View key={row.label} style={s.row}>
                  <Text style={s.rowLabel}>{row.label}</Text>
                  <Text style={s.rowValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </NativeAnchoredPanel>
    </>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `StatsPills .pill`: 22-tall chip on `1px 8px`, r8, 6px between the glyph
    // and its readings, tertiary 12/20 text. The 20 line plus the 1px block pad
    // is the whole 22; the 44pt touch target comes from hitSlop, not the box.
    pill: {
      alignItems: 'center',
      borderRadius: theme.radius.sm,
      flexDirection: 'row',
      flexShrink: 1,
      gap: 6,
      minWidth: 0,
      paddingHorizontal: 8,
      paddingVertical: 1,
    },
    // `button.pill[aria-expanded='true']`: the hover fill and secondary tone.
    pillOpen: { backgroundColor: theme.colors.floatingHover },
    text: { ...textStyle(theme, 'label', 'tertiary'), flexShrink: 1, minWidth: 0 },
    // `stat-dialog.module.css .panel`: menu surface, r12, 16px padding, prominent
    // elevation, 12/18 secondary text.
    scroll: { flexShrink: 1 },
    panel: { padding: 16 },
    // `.title`: section name left, headline value right, 16px apart, both primary.
    title: { flexDirection: 'row', gap: 16, justifyContent: 'space-between', marginBottom: 8 },
    titleLabel: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: 6, minWidth: 0 },
    titleText: { color: theme.colors.ink, fontSize: 12, fontWeight: '500', lineHeight: 18 },
    titleValue: { color: theme.colors.ink, fontSize: 12, fontWeight: '500', lineHeight: 18 },
    // `.titleRule`: a hairline under the heading.
    titleRule: { backgroundColor: theme.colors.borderL3, height: StyleSheet.hairlineWidth, marginBottom: 10 },
    // `.details`: 6px between rows, label 76pt-min column then value.
    details: { gap: 6 },
    row: { flexDirection: 'row', gap: 16 },
    rowLabel: { ...textStyle(theme, 'caption', 'tertiary'), flexShrink: 1, minWidth: 76 },
    rowValue: { ...textStyle(theme, 'caption', 'secondary'), flex: 1, textAlign: 'right' },
    pressed: { opacity: 0.62 },
  })
