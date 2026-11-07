import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import { goalDockState } from '@/components/session-goal-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { TodoItem } from '@/components/todo-logic'
import type { MobileGoalView } from '@/types/mobile'
import { Pressable, StyleSheet, Text, View } from 'react-native'

/** One dock the composer can open above the input card. */
export type ComposerDock = 'todo' | 'goal' | 'queue'

/**
 * Renders the three session docks as one row of chips.
 *
 * The desktop stacks a task list, a goal bar and a queue card above the
 * composer; on a 402pt screen those three cards spent roughly a third of the
 * transcript, and each carried its own elevation and outline. The row states the
 * same three facts in ~28pt and opens one dock at a time, so the transcript
 * keeps the height.
 *
 * @param props - The current goal, tasks, queued count, which dock is open, and the toggle.
 * @returns The chip row, or `null` when the session has none of the three.
 */
export function ComposerDockChips({
  goal,
  onToggle,
  open,
  queued,
  todos,
}: {
  goal: MobileGoalView | undefined
  onToggle: (dock: ComposerDock) => void
  open: ComposerDock | undefined
  queued: number
  todos: TodoItem[] | undefined
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const goalState = goalDockState(goal)
  const done = todos?.filter((todo) => todo.status === 'completed').length ?? 0
  const chips: Array<{ dock: ComposerDock; icon: NativeIconName; label: string; warning?: boolean }> = []
  if (todos !== undefined && todos.length > 0) {
    chips.push({ dock: 'todo', icon: 'checklist-outline', label: format('todo.chip', { done, total: todos.length }) })
  }
  if (goalState !== undefined) {
    chips.push({
      dock: 'goal',
      icon: 'goal-outline',
      label: message(`activity.${goalState.label}`),
      warning: goalState.label === 'goalBlocked',
    })
  }
  if (queued > 0) {
    chips.push({ dock: 'queue', icon: 'queue-outline', label: format('queue.chip', { count: queued }) })
  }
  if (chips.length === 0) return null
  return (
    <View style={s.row}>
      {chips.map((chip) => {
        const active = open === chip.dock
        return (
          <Pressable
            android_ripple={{ borderless: false }}
            accessibilityLabel={chip.label}
            accessibilityRole="button"
            accessibilityState={{ expanded: active }}
            hitSlop={{ top: 6, bottom: 6 }}
            key={chip.dock}
            onPress={() => onToggle(chip.dock)}
            style={({ pressed }) => [s.chip, active && s.chipActive, pressed && s.pressed]}
          >
            <NativeIcon
              name={chip.icon}
              size={13}
              color={chip.warning ? theme.colors.warning : active ? theme.colors.ink : theme.colors.inkTertiary}
            />
            <Text numberOfLines={1} style={[s.label, chip.warning && s.labelWarning]}>
              {chip.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      flexDirection: 'row',
      gap: 5,
      maxWidth: '100%',
      minHeight: 28,
      paddingHorizontal: 10,
    },
    chipActive: { backgroundColor: theme.colors.interactiveHover },
    label: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 12, lineHeight: 18 },
    labelWarning: { color: theme.colors.warning },
    pressed: { opacity: 0.62 },
  })
