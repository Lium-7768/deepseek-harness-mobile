/**
 * One tappable row in the session drawer: a workspace header, a session, or a
 * radio option inside a menu.
 *
 * Split from the drawer body so the drawer's query, menu state, and mutations
 * stay readable; these components own presentation only.
 */
import { NativeRunningRing } from '@/components/native-running-ring'
import { NativeIcon } from '@/components/native-icon'
import { NativeMenuPanel } from '@/components/native-menu-panel'
import { sessionDisplayTitle, sessionTimeLabel } from '@/components/session-drawer-logic'
import { makeSessionDrawerStyles } from '@/components/session-drawer-styles'
import { format, t as message } from '@/locale'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { DENSE_ROW_FONT_CAP } from '@/theme/text-scale'
import type { SessionSummary } from '@/types/mobile'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

export function WorkspaceItem({
  active,
  label,
  collapsed,
  onPress,
  onLongPress,
}: {
  /** The current session lives in this workspace, so its folder is accented. */
  active: boolean
  workspaceKey: string
  label: string
  collapsed: boolean
  onPress: () => void
  onLongPress?: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeSessionDrawerStyles)
  return (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${collapsed ? message('drawer.expand') : message('drawer.collapse')}${label}`}
      accessibilityState={{ expanded: !collapsed }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [styles.folder, pressed && styles.pressed]}
    >
      {/* `Rows.module.css .projectRow`: the 16pt leading slot holds the folder
          and nothing else; its open/closed artwork and accent fill carry the
          state the desktop never draws a chevron for. */}
      <NativeIcon
        name={collapsed ? 'folder-close' : 'folder-open'}
        size={16}
        color={active ? theme.colors.accent : theme.colors.inkMuted}
      />
      <Text numberOfLines={1} style={styles.folderText}>
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * Renders one session row with its trailing actions.
 *
 * The Web keeps the row's time and its action cluster in separate trailing
 * cells and reveals the cluster while the row is hovered or its menu is open
 * (`Rows.module.css .rowActions`). A phone has no hover, so time and the
 * overflow control stay visible at rest; destructive actions stay inside the
 * menu, which the overflow control and a long press both open.
 *
 * @param props - The session, its selection state, and the row's handlers.
 * @returns The row, and its action menu while open.
 */
export function SessionItem({
  onArchive,
  onRestore,
  pinned = false,
  onTogglePin,
  onCopyId,
  subagentsRunning = 0,
  onMoveUp,
  onMoveDown,
  archived = false,
  onExport,
  onFork,
  onPress,
  onRename,
  selected,
  session,
}: {
  onArchive: () => void
  onRestore: () => void
  /** The session is pinned on the desktop; pinned rows lead their section. */
  pinned?: boolean
  onTogglePin: () => void
  onCopyId: () => void
  /** Running sub-agents under this session, from the list's sub-agent catalog. */
  subagentsRunning?: number
  onMoveUp?: () => void
  onMoveDown?: () => void
  archived?: boolean
  onExport: () => void
  onFork: () => void
  onPress: () => void
  onRename: () => void
  selected: boolean
  session: SessionSummary
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeSessionDrawerStyles)
  const [menuOpen, setMenuOpen] = useState(false)
  const title = sessionDisplayTitle(session)
  const time = sessionTimeLabel(session)
  // A blank session is a provisional placeholder: nothing has happened in it, so
  // a "now" stamp and the row verbs (rename/fork/archive) would all act on
  // content that does not exist. Both trailing cells stay off until the first
  // prompt (`Rows.tsx`: `!row.blank` gates the time and the action cluster).
  const blank = session.blank === true
  // Three groups, not one list of eight verbs: the row's own identity actions,
  // what it produces, and the one destructive action last.
  const orderedActions = [
    {
      label: message(pinned ? 'drawer.unpinSession' : 'drawer.pinSession'),
      icon: 'pin-outline' as const,
      onPress: onTogglePin,
    },
    { label: message('drawer.rename'), icon: 'edit-outline' as const, onPress: onRename },
    { label: message('drawer.forkSession'), icon: 'branch-outline' as const, onPress: onFork },
    { label: message('log.action'), icon: 'download-outline' as const, onPress: onExport },
    { label: message('drawer.copySessionId'), icon: 'copy-outline' as const, onPress: onCopyId },
    ...(onMoveUp ? [{ label: message('drawer.moveUp'), icon: 'chevron-up-outline' as const, onPress: onMoveUp }] : []),
    ...(onMoveDown
      ? [{ label: message('drawer.moveDown'), icon: 'chevron-down-outline' as const, onPress: onMoveDown }]
      : []),
  ]
  const destructive = archived
    ? [{ label: message('drawer.restore'), icon: 'archive-outline' as const, onPress: onRestore }]
    : [{ label: message('drawer.archiveSession'), icon: 'archive-outline' as const, onPress: onArchive }]
  const actions = [...orderedActions, ...destructive]
  const groups = [
    { options: orderedActions.slice(0, 2), title: message('drawer.sessionActionsIdentity') },
    { options: orderedActions.slice(2), title: message('drawer.sessionActionsOutput') },
    { options: destructive, title: message('drawer.sessionActionsArchive') },
  ].filter((group) => group.options.length > 0)
  return (
    <>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={format('drawer.openSession', { title })}
        accessibilityState={{ selected }}
        delayLongPress={350}
        onLongPress={() => setMenuOpen(true)}
        onPress={onPress}
        hitSlop={{ top: 6, bottom: 6 }}
        style={({ pressed }) => [
          styles.session,
          (selected || menuOpen) && styles.selected,
          pressed && styles.rowPressed,
        ]}
      >
        <View style={styles.sessionStatus}>
          {session.running === true && !archived ? (
            <NativeRunningRing />
          ) : pinned ? (
            <View accessible accessibilityLabel={message('drawer.pinned')}>
              <NativeIcon name="pin-outline" size={12} color={theme.colors.inkMuted} />
            </View>
          ) : null}
        </View>
        <Text
          maxFontSizeMultiplier={DENSE_ROW_FONT_CAP}
          numberOfLines={1}
          style={[styles.sessionTitle, archived && styles.archivedLabel]}
        >
          {title}
        </Text>
        {subagentsRunning > 0 && !archived ? (
          <View
            accessibilityLabel={format('drawer.subagentsRunning', { count: subagentsRunning })}
            style={styles.subagentBadge}
          >
            <Text maxFontSizeMultiplier={DENSE_ROW_FONT_CAP} style={styles.subagentBadgeText}>
              {subagentsRunning}
            </Text>
          </View>
        ) : null}
        {blank ? null : (
          <Text maxFontSizeMultiplier={DENSE_ROW_FONT_CAP} numberOfLines={1} style={styles.sessionTime}>
            {time}
          </Text>
        )}
        {blank ? null : (
          <>
            <Pressable
              android_ripple={{ borderless: false }}
              accessibilityLabel={format('drawer.sessionActionsFor', { title })}
              accessibilityRole="button"
              accessibilityState={{ expanded: menuOpen }}
              hitSlop={6}
              onPress={() => setMenuOpen((current) => !current)}
              style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}
            >
              <NativeIcon name="ellipsis-outline" size={13} color={theme.colors.inkMuted} />
            </Pressable>
          </>
        )}
      </Pressable>
      <NativeMenuPanel
        actionMenu
        groups={groups.map((group) => ({
          options: group.options.map((action) => ({
            icon: action.icon,
            label: action.label,
            value: action.label,
          })),
          title: group.title,
        }))}
        onClose={() => setMenuOpen(false)}
        onSelect={(value) => {
          const action = actions.find((candidate) => candidate.label === value)
          action?.onPress()
        }}
        open={menuOpen}
        title={title}
      />
    </>
  )
}
