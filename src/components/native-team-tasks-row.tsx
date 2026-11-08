import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import { teamTaskProgress, type TeamTask } from '@/components/team-task-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

const STATUS_ICON: Record<TeamTask['status'], NativeIconName> = {
  completed: 'check-outline',
  in_progress: 'play-outline',
  pending: 'clock-outline',
}

/**
 * Summarises the shared task board above the transcript.
 *
 * The desktop's team plugin draws the whole board in its own panel. A phone keeps
 * one line — how many of the board's tasks are done — and opens the list, because
 * a board with a dozen rows would push the conversation off screen. The phone only
 * reads it: claiming and closing tasks stays with the agents that own them.
 *
 * @param props - The projected board.
 * @returns The summary row, or nothing when the session has no board.
 */
export function NativeTeamTasksRow({ tasks }: { tasks: readonly TeamTask[] }): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [open, setOpen] = useState(false)
  if (tasks.length === 0) return null
  const { completed, total } = teamTaskProgress(tasks)
  return (
    <>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={format('conversation.teamTasks', { completed, total })}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [s.row, pressed && s.pressed]}
      >
        <NativeIcon name="apps-add-outline" size={15} color={theme.colors.inkMuted} />
        <Text style={s.label}>{format('conversation.teamTasks', { completed, total })}</Text>
        <NativeIcon name="chevron-right-outline" size={15} color={theme.colors.inkTertiary} />
      </Pressable>
      <NativeAnchoredPanel onClose={() => setOpen(false)} open={open}>
        <ScrollView contentContainerStyle={s.sheet}>
          <Text style={s.sheetTitle}>{message('conversation.teamTasksTitle')}</Text>
          {tasks.map((task) => (
            <View key={task.id} style={s.task}>
              <NativeIcon
                name={STATUS_ICON[task.status]}
                size={15}
                color={task.status === 'completed' ? theme.colors.success : theme.colors.inkMuted}
              />
              <View style={s.taskCopy}>
                <Text numberOfLines={2} style={s.subject}>
                  {task.subject}
                </Text>
                {task.ownerName === undefined ? null : (
                  <Text numberOfLines={1} style={s.owner}>
                    {format('conversation.teamTaskOwner', { name: task.ownerName })}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </NativeAnchoredPanel>
    </>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 7,
      minHeight: 32,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 4,
    },
    label: { color: theme.colors.inkMuted, flex: 1, fontSize: 13, lineHeight: 20 },
    sheet: { gap: 4, paddingBottom: 12, paddingHorizontal: 16, paddingTop: 16 },
    sheetTitle: { color: theme.colors.ink, fontSize: 15, fontWeight: '600', lineHeight: 22, paddingBottom: 4 },
    task: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, paddingVertical: 6 },
    taskCopy: { flex: 1, gap: 2 },
    subject: { color: theme.colors.ink, fontSize: 14, lineHeight: 20 },
    owner: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18 },
    pressed: { opacity: 0.62 },
  })
