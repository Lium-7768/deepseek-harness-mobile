import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import type { ContextMeterPanel } from '@/components/session-stats-logic'
import { format } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { textStyle } from '@/theme/text'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SvgXml } from 'react-native-svg'

/** Ring geometry: the desktop's 14px viewBox with a 2px stroke. */
const RADIUS = 5.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Draws the composer dock's context-occupancy meter and its composition panel.
 *
 * `ContextMeter` prints a 14pt ring whose arc follows the percentage, then the
 * reading, on a `1px 8px` r24 chip. The press opens a panel headed by the
 * occupancy sentence and `~used / window`, over a segmented bar and one legend
 * row per composition part.
 *
 * @param props - Panel content from {@link contextMeterPanel}; `undefined` renders nothing.
 * @returns The meter chip, and its panel while open.
 */
export function NativeContextMeter({ panel }: { panel: ContextMeterPanel | undefined }): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [open, setOpen] = useState(false)
  if (panel === undefined) return null
  const reading = `${panel.percent}%`
  // Legend swatch tints, in `ContextMeter` bar-segment order.
  const tones = {
    messages: theme.colors.meterMessages,
    system: theme.colors.meterSystem,
    tools: theme.colors.meterTools,
  } as const
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none">
<circle cx="7" cy="7" r="${RADIUS}" stroke="${theme.colors.borderL3}" stroke-width="2"/>
<circle cx="7" cy="7" r="${RADIUS}" stroke="${theme.colors.inkTertiary}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${(CIRCUMFERENCE * panel.percent) / 100} ${CIRCUMFERENCE}" transform="rotate(-90 7 7)"/>
</svg>`
  const total = panel.rows.reduce((sum, row) => sum + row.share, 0)
  return (
    <>
      <Pressable
        accessibilityLabel={format('session.contextUsed', { percent: panel.percent })}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [s.trigger, open && s.triggerOpen, pressed && s.pressed]}
      >
        <SvgXml accessibilityElementsHidden height={14} width={14} xml={xml} />
        <Text numberOfLines={1} style={s.text}>
          {reading}
        </Text>
      </Pressable>
      <NativeAnchoredPanel onClose={() => setOpen(false)} open={open}>
        <ScrollView contentContainerStyle={s.panel} style={s.scroll}>
          <View style={s.header}>
            <Text style={s.headline}>{format('session.contextUsedLabel', {})}</Text>
            <Text style={s.percent}>{reading}</Text>
            <Text style={s.figures}>{panel.figures}</Text>
          </View>
          {/* `.bar` holds the track; the coloured run spans only the occupancy
              reading, and each part is proportional inside it
              (`width: percent * share / total`). */}
          <View style={s.bar}>
            <View style={[s.fillRun, { width: `${panel.percent}%` }]}>
              {panel.rows.map((row) => (
                <View
                  key={row.tone}
                  style={[s.segment, { backgroundColor: tones[row.tone], flexGrow: total > 0 ? row.share : 0 }]}
                />
              ))}
            </View>
          </View>
          <View style={s.rows}>
            {panel.rows.map((row) => (
              <View key={row.tone} style={s.row}>
                <View style={[s.swatch, { backgroundColor: tones[row.tone] }]} />
                <Text style={s.rowLabel}>{row.label}</Text>
                <Text style={s.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </NativeAnchoredPanel>
    </>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `ContextMeter .trigger`: a 24-radius chip on `1px 8px` with a 6px gap.
    trigger: {
      alignItems: 'center',
      borderRadius: 24,
      flexDirection: 'row',
      flexShrink: 0,
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minHeight: 36,
    },
    triggerOpen: { backgroundColor: theme.colors.floatingHover },
    text: textStyle(theme, 'body', 'tertiary'),
    // `ContextMeter .panel`: menu surface, r12, 12px padding, 12/20 secondary.
    scroll: { flexShrink: 1 },
    panel: { padding: 12 },
    header: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    headline: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 20 },
    // `.percent`: the reading takes the primary tone at the same weight.
    percent: { color: theme.colors.ink, fontSize: 12, fontWeight: '500', lineHeight: 20 },
    // `.figures`: right-aligned `~used / window`.
    figures: { color: theme.colors.ink, flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 20, textAlign: 'right' },
    // `.bar`: a 4-tall 999-radius track holding 1px-separated segments.
    bar: {
      backgroundColor: theme.colors.interactiveHover,
      borderRadius: 999,
      flexDirection: 'row',
      gap: 1,
      height: 4,
      marginBottom: 12,
      marginTop: 10,
      overflow: 'hidden',
    },
    fillRun: { flexDirection: 'row', gap: 1 },
    segment: { borderRadius: 1, flexBasis: 0, minWidth: 2 },
    rows: { gap: 4, marginTop: 6 },
    row: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingVertical: 2 },
    swatch: { borderRadius: 2, height: 8, width: 8 },
    rowLabel: { ...textStyle(theme, 'label', 'secondary'), flex: 1 },
    rowValue: textStyle(theme, 'label'),
    pressed: { opacity: 0.62 },
  })
