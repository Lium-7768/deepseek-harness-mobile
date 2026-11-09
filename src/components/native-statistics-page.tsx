import { sessionStatisticPanel } from '@/components/session-stats-logic'
import type { SharedEventItem } from '@/shared/dsh-presentation'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

/**
 * The desktop's 统计 tab: the session's own readings on a page.
 *
 * The dock pills open these same numbers as popovers, which on a phone cover the
 * transcript they describe. The tab prints them in full, one section per pill, in the
 * order the dock shows them.
 *
 * @param props.items - Visible events, used when a projection is absent.
 * @param props.projections - Durable session projections.
 * @returns The statistics page, or `null` when the session has nothing to report.
 */
export function NativeStatisticsPage({
  items,
  projections,
}: {
  items: readonly SharedEventItem[]
  projections: Record<string, unknown> | undefined
}): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  const panels = [
    sessionStatisticPanel('time', projections, items),
    sessionStatisticPanel('usage', projections, items),
  ].filter((panel) => panel !== undefined)
  if (panels.length === 0) return null
  return (
    <ScrollView contentContainerStyle={s.page} style={s.scroll}>
      {panels.map((panel) => (
        <View key={panel.title} style={s.card}>
          <View style={s.heading}>
            <Text style={s.title}>{panel.title}</Text>
            <Text style={s.headline}>{panel.headline}</Text>
          </View>
          {panel.rows.map((row) => (
            <View key={row.label} style={s.row}>
              <Text style={s.label}>{row.label}</Text>
              <Text style={s.value}>{row.value}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    page: { gap: 12, padding: theme.spacing.lg },
    // The popover's own surface, stood up as a card on the page.
    card: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderL2,
      borderRadius: theme.radius.panel,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 2,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    heading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6 },
    title: { color: theme.colors.ink, fontSize: 14, fontWeight: '600', lineHeight: 22 },
    headline: { color: theme.colors.inkMuted, fontSize: 13, fontVariant: ['tabular-nums'], lineHeight: 22 },
    row: { alignItems: 'center', flexDirection: 'row', gap: 24, justifyContent: 'space-between', paddingVertical: 5 },
    label: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    value: { color: theme.colors.ink, fontSize: 13, fontVariant: ['tabular-nums'], lineHeight: 20 },
  })
