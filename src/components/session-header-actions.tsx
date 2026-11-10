import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import { NativeMenuPanel, type NativeMenuOption } from '@/components/native-menu-panel'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

/** What the header reports about the session's own children. */
/** One session-menu row: the label the menu draws and what it runs. */
export interface HeaderMenuRow extends NativeMenuOption {
  onSelect: () => void
}

export interface SessionHeaderCounts {
  /** Background jobs the Host knows about, running or settled. */
  jobs: number
  /** Background jobs still running. */
  runningJobs: number
  /** Direct child sessions. */
  subagents: number
}

/**
 * The header actions the desktop draws beside a session's title.
 *
 * The desktop puts the subagent catalog, the background-job list and the session menu
 * in its header. The phone keeps the same three affordances, collapsed to the counts
 * that matter while reading: a subagent count, a running-job count, and the session
 * menu. A zero count draws nothing rather than an empty control.
 *
 * @param props.counts - Subagent and job counts for this session.
 * @param props.menu - Rows of the session menu.
 * @param props.onOpenJobs - Opens the background-job list.
 * @param props.onOpenSubagents - Opens the subagent list.
 * @returns The action cluster.
 */
export function SessionHeaderActions({
  counts,
  menu,
  onOpenJobs,
  onOpenPending,
  onOpenSubagents,
  pending,
}: {
  counts: SessionHeaderCounts
  menu: readonly HeaderMenuRow[]
  onOpenJobs: () => void
  /** Opens the screen that answers pending interactions. */
  onOpenPending: () => void
  onOpenSubagents: () => void
  /** Pending interactions; `0` draws nothing. */
  pending: number
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <View style={s.row}>
      {counts.subagents > 0 ? (
        <HeaderAction
          icon="agent-preset-outline"
          label={format('conversation.headerSubagents', { count: counts.subagents })}
          onPress={onOpenSubagents}
        />
      ) : null}
      {counts.jobs > 0 ? (
        <HeaderAction
          icon="queue-outline"
          label={
            counts.runningJobs > 0
              ? format('conversation.headerJobsRunning', { running: counts.runningJobs, total: counts.jobs })
              : format('conversation.headerJobs', { count: counts.jobs })
          }
          onPress={onOpenJobs}
          {...(counts.runningJobs > 0 ? { live: true } : {})}
        />
      ) : null}
      {pending > 0 ? (
        <HeaderAction
          icon="checklist-outline"
          label={format('conversation.headerPending', { count: pending })}
          live
          onPress={onOpenPending}
        />
      ) : null}
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={message('conversation.sessionMenu')}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setMenuOpen(true)}
        style={({ pressed }) => [s.action, pressed && s.pressed]}
      >
        <NativeIcon name="ellipsis-outline" size={18} color={theme.colors.inkMuted} />
      </Pressable>
      <NativeMenuPanel
        groups={[{ options: menu.map(({ onSelect: _onSelect, ...row }) => row) }]}
        onClose={() => setMenuOpen(false)}
        onSelect={(value) => {
          setMenuOpen(false)
          menu.find((row) => row.value === value)?.onSelect()
        }}
        open={menuOpen}
      />
    </View>
  )
}

/** One count-toting header action. */
function HeaderAction({
  icon,
  label,
  live = false,
  onPress,
}: {
  icon: NativeIconName
  label: string
  /** Draws the count in the accent colour while the work is running. */
  live?: boolean
  onPress: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [s.action, pressed && s.pressed]}
    >
      <NativeIcon name={icon} size={17} color={live ? theme.colors.accent : theme.colors.inkMuted} />
      <Text numberOfLines={1} style={[s.count, live && s.countLive]}>
        {label.match(/\d+/g)?.at(-1) ?? ''}
      </Text>
    </Pressable>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: { alignItems: 'center', flexDirection: 'row', gap: 4 },
    action: { alignItems: 'center', flexDirection: 'row', gap: 2, paddingHorizontal: 4, paddingVertical: 6 },
    count: { color: theme.colors.inkMuted, fontSize: 11, fontVariant: ['tabular-nums'], lineHeight: 16 },
    countLive: { color: theme.colors.accent },
    pressed: { opacity: 0.55 },
  })
