import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import {
  formatTrajectoryDuration,
  projectNativeTrajectoryActivities,
  trajectoryDetailPreview,
  type NativeTrajectoryActivity,
} from '@/components/session-trajectory-logic'
import { format, t as message } from '@/locale'
import type { SharedEventItem } from '@/shared/dsh-presentation'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import { memo } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

export type WorkbenchTab = 'chat' | 'trajectory'

/**
 * Renders the chat/trajectory switch and, when anything waits on the reader, the
 * pending-actions destination in the same row.
 *
 * The pending count used to sit in its own warning strip under the tabs: a second
 * horizontal band above the transcript for the one thing that most needs an
 * answer. It rides in the tab row as a badge instead.
 *
 * @param props - The active tab, the switch, and how many interactions wait.
 * @returns The tab row.
 */
export function WorkbenchTabs({
  onChange,
  onOpenPending,
  pending,
  tab,
}: {
  onChange: (tab: WorkbenchTab) => void
  onOpenPending: () => void
  /** Pending interactions; `0` hides the destination. */
  pending: number
  tab: WorkbenchTab
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.tabs}>
      <Tab active={tab === 'chat'} label={message('workbench.chat')} onPress={() => onChange('chat')} />
      <Tab
        active={tab === 'trajectory'}
        label={message('workbench.trajectory')}
        onPress={() => onChange('trajectory')}
      />
      {pending > 0 ? (
        <Pressable
          android_ripple={{ borderless: false }}
          accessibilityLabel={format('conversation.pendingCount', { count: pending })}
          accessibilityRole="button"
          hitSlop={{ top: 5, bottom: 5 }}
          onPress={onOpenPending}
          style={s.pendingTab}
        >
          <NativeIcon name="warning-triangle-outline" size={13} color={theme.colors.warning} />
          <Text style={s.pendingText}>{message('workbench.pending')}</Text>
          <View style={s.pendingBadge}>
            <Text style={s.pendingBadgeText}>{pending}</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  return (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 5, bottom: 5 }}
      onPress={onPress}
      style={s.tab}
    >
      <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
      {active ? <View style={s.tabBar} /> : null}
    </Pressable>
  )
}

/**
 * Native counterpart to the desktop trajectory ledger. It projects durable
 * session events into compact operations rather than exposing wire-event names.
 */
export function TrajectoryPanel({ items }: { items: SharedEventItem[] }): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const activities = projectNativeTrajectoryActivities(items)
  return (
    <FlatList
      data={activities}
      keyExtractor={(activity) => activity.id}
      contentContainerStyle={s.panelList}
      renderItem={({ item }) => <TrajectoryActivityRow activity={item} />}
      ListEmptyComponent={<Text style={s.empty}>{message('workbench.emptyTrajectory')}</Text>}
    />
  )
}

const TrajectoryActivityRow = memo(function TrajectoryActivityRow({
  activity,
}: {
  activity: NativeTrajectoryActivity
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const stateLabel = activityStateLabel(activity)
  const detailLabel = activity.detail === undefined ? '' : `：${activity.detail}`
  const durationLabel =
    activity.durationMs === undefined
      ? ''
      : format('workbench.elapsed', { duration: formatTrajectoryDuration(activity.durationMs) })
  const preview = trajectoryDetailPreview(activity.detail)
  return (
    <View accessibilityLabel={`${activity.title}${stateLabel}${detailLabel}${durationLabel}`} style={s.activityWrap}>
      {activity.showTurn === true && activity.turn !== undefined ? (
        <Text style={s.turnLabel}>{format('workbench.turn', { turn: activity.turn })}</Text>
      ) : null}
      <View style={s.activityRow}>
        <View style={[s.traceIndex, activity.state === 'failed' && s.traceIndexFailed]}>
          <NativeIcon name={activityIcon(activity)} size={13} color={activityColor(activity, theme)} />
        </View>
        <View style={s.traceBody}>
          <View style={s.activityTitleRow}>
            <Text style={s.traceLabel}>{activity.title}</Text>
            {stateLabel ? (
              <Text style={[s.state, activity.state === 'failed' && s.stateFailed]}>{stateLabel}</Text>
            ) : null}
          </View>
          {preview ? (
            <Text ellipsizeMode="tail" numberOfLines={1} style={s.traceDetail}>
              {preview}
            </Text>
          ) : null}
        </View>
        {activity.durationMs !== undefined ? (
          <Text style={s.duration}>{formatTrajectoryDuration(activity.durationMs)}</Text>
        ) : null}
      </View>
    </View>
  )
})

function activityIcon(activity: NativeTrajectoryActivity): NativeIconName {
  switch (activity.kind) {
    case 'assistant':
      return 'agent-preset-outline'
    case 'compaction':
      return 'data-outline'
    case 'context':
      return 'deliver-doc'
    case 'error':
      return 'warning-triangle-outline'
    case 'question':
      return 'warning-triangle-outline'
    case 'reasoning':
      return 'think-outline'
    case 'retry':
      return 'refresh-outline'
    case 'tool':
      return 'skill-outline'
    case 'user':
      return 'new-chat-outline'
  }
}

function activityColor(activity: NativeTrajectoryActivity, theme: AppTheme): string {
  if (activity.state === 'failed' || activity.kind === 'error') return theme.colors.danger
  if (activity.kind === 'question') return theme.colors.warning
  return theme.colors.accentText
}

function activityStateLabel(activity: NativeTrajectoryActivity): string | undefined {
  if (activity.state === 'running') return message('workbench.activityRunning')
  if (activity.state === 'failed') return message('workbench.activityFailed')
  if (activity.kind === 'tool' && activity.state === 'completed') return message('workbench.activityCompleted')
  return undefined
}

export function ContextRows({ items }: { items: SharedEventItem[] }): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const names = Array.from(new Set(items.flatMap((item) => contextName(item.event))))
  if (!names.length) return null
  // One line, not one per source: this is bookkeeping above the transcript, and
  // a session that injected three files would otherwise push the first message
  // a third of a screen further down.
  const first = names[0] ?? ''
  const label =
    names.length === 1
      ? format('workbench.contextInjection', { name: first })
      : format('workbench.contextInjectionMore', { count: names.length, name: first })
  return (
    <View style={s.contextCompact}>
      <View style={s.contextCompactRow}>
        <NativeIcon name="deliver-doc" size={15} color={theme.colors.inkMuted} />
        <Text numberOfLines={1} style={s.contextCompactText}>
          {label}
        </Text>
      </View>
    </View>
  )
}

function contextName(event: Record<string, unknown>): string[] {
  const type = typeof event.type === 'string' ? event.type.toLowerCase() : ''
  if (!type.includes('context')) return []
  const source = [event.sourceName, event.source, event.filename, event.fileName].find(
    (value) => typeof value === 'string' && value.trim(),
  )
  if (typeof source !== 'string') return []
  const name = source.split(/[\\/]/).at(-1)?.trim() ?? ''
  return name && !isInternalContextName(name) ? [name] : []
}

function isInternalContextName(name: string): boolean {
  return /agents\.md|system|prompt|skill|internal|mobilegatewayok/i.test(name)
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `ConversationRoot.module.css .tabs` / `.viewTabs` / `.tab`: a 25px row of
    // 46px tab boxes 12px apart (measured: 对话 at 10..56, 轨迹 at 68..114), with a
    // 2px bar under the active one that reaches 1px past the tab box onto the
    // header rule.
    tabs: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 12,
      paddingLeft: theme.spacing.sm,
    },
    tab: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 35,
      paddingBottom: 9,
      paddingHorizontal: 10,
      paddingTop: 10,
      position: 'relative',
    },
    tabBar: {
      backgroundColor: theme.colors.accent,
      borderRadius: 2,
      bottom: -1,
      height: 2,
      left: 10,
      position: 'absolute',
      right: 10,
    },
    // The Web prints the tab label at 13/500 on its 16px line with no glyph.
    tabText: { color: theme.colors.inkTertiary, fontSize: 13, fontWeight: '500', lineHeight: 16 },
    // The Web's active tab is `state-business-primary` (deepseek-500), the same
    // tone as the underline beneath it; a lighter accent tone would split the
    // label from its own indicator.
    tabTextActive: { color: theme.colors.accent },
    // The pending destination sits at the row's trailing edge, tinted like the
    // strip it replaced so a waiting decision keeps its warning colour.
    pendingTab: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
      marginLeft: 'auto',
      paddingRight: theme.spacing.md,
    },
    pendingText: { color: theme.colors.warning, fontSize: 13, fontWeight: '600', lineHeight: 16 },
    pendingBadge: {
      alignItems: 'center',
      backgroundColor: theme.colors.warningSoft,
      borderRadius: theme.radius.pill,
      justifyContent: 'center',
      minWidth: 18,
      paddingHorizontal: 5,
    },
    pendingBadgeText: { color: theme.colors.warning, fontSize: 11, fontWeight: '700', lineHeight: 16 },
    panelList: { gap: 8, padding: 14 },
    activityWrap: { gap: 5 },
    // The disclosed turn heading is a 24pt line box inside 28pt, leaving 4pt under
    // it. A minimum rather than a fixed height, so large Dynamic Type grows the row
    // instead of clipping the label.
    turnLabel: {
      color: theme.colors.inkMuted,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 24,
      marginBottom: 4,
      minHeight: 28,
      paddingBottom: 4,
      paddingLeft: 30,
    },
    activityRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
    traceIndex: {
      alignItems: 'center',
      backgroundColor: theme.colors.accentSoft,
      borderRadius: 10,
      flexShrink: 0,
      height: 20,
      justifyContent: 'center',
      marginTop: 2,
      width: 20,
    },
    traceIndexFailed: { backgroundColor: theme.colors.dangerSoft },
    traceBody: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flex: 1,
      flexShrink: 1,
      gap: 3,
      minWidth: 0,
      paddingBottom: 12,
    },
    activityTitleRow: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    traceLabel: { color: theme.colors.ink, fontSize: 14, lineHeight: 22 },
    // `Trajectory.module.css` prints each cell as one truncated mono line at
    // 12/18 in `label-tertiary`; the row grows no taller than that.
    traceDetail: { color: theme.colors.inkTertiary, fontFamily: MONOSPACE_FONT, fontSize: 12, lineHeight: 18 },
    state: { color: theme.colors.inkTertiary, fontSize: 11, fontWeight: '500', lineHeight: 16 },
    stateFailed: { color: theme.colors.danger },
    duration: { color: theme.colors.inkTertiary, fontSize: 11, lineHeight: 16 },
    contextCompact: { gap: 8, marginTop: 2, paddingHorizontal: 16, paddingTop: 12 },
    contextCompactRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
    contextCompactText: { color: theme.colors.inkTertiary, flex: 1, fontSize: 13, lineHeight: 20 },
    empty: { color: theme.colors.inkMuted, paddingVertical: 24, textAlign: 'center' },
  })
