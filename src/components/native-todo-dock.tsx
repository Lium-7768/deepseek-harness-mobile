import { NativeRunningRing } from '@/components/native-running-ring'
import { NativeIcon } from '@/components/native-icon'
import { todoProgressLabel, todoStatusLabel, type TodoItem } from '@/components/todo-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native'

/**
 * Renders the task list the desktop registers as `conversation.input.dock` id
 * `todo` (order 0, ahead of the goal bar and the queue).
 *
 * The dock collapses to one header row by default, exactly as `TodoPanel` does:
 * a checklist glyph, `任务`, the joined readings, and the disclosure chevron.
 * Expanding prints one line per task, each behind the `StateDot` the Web draws
 * for that status.
 *
 * @param props - The validated tasks from the session's `todos` projection.
 * @returns The dock, or `null` when the projection holds no task.
 */
export function NativeTodoDock({ todos }: { todos: TodoItem[] | undefined }): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [expanded, setExpanded] = useState(false)
  if (todos === undefined || todos.length === 0) return null
  const progress = todoProgressLabel(todos)
  return (
    <View style={s.card}>
      <View style={s.body}>
        <Pressable
          accessibilityLabel={progress === undefined ? message('todo.title') : `${message('todo.title')} ${progress}`}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={{ top: 6, bottom: 6 }}
          onPress={() => setExpanded((current) => !current)}
          style={({ pressed }) => [s.header, pressed && s.pressed]}
        >
          <View style={s.lead}>
            <NativeIcon name="checklist-outline" size={14} color={theme.colors.inkTertiary} />
          </View>
          <Text maxFontSizeMultiplier={1.4} style={s.title}>
            {message('todo.title')}
          </Text>
          {progress === undefined ? null : (
            <Text numberOfLines={1} style={s.progress}>
              {progress}
            </Text>
          )}
          <View style={s.chevron}>
            <NativeIcon
              name={expanded ? 'chevron-down-outline' : 'chevron-up-outline'}
              size={14}
              color={theme.colors.inkTertiary}
            />
          </View>
        </Pressable>
        {expanded ? (
          <ScrollView style={s.scroll}>
            <View style={s.list}>
              {todos.map((todo) => (
                <View key={todo.content} style={s.item}>
                  <View accessibilityLabel={todoStatusLabel(todo.status)} accessibilityRole="image" style={s.glyph}>
                    <TodoMarker status={todo.status} />
                  </View>
                  <Text numberOfLines={1} style={s.content}>
                    {todo.content}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : null}
      </View>
    </View>
  )
}

/**
 * Draws one status marker at the sizes `StateDot` uses: the ongoing ring keeps
 * its 14pt box, and every solid state paints a 6pt core inside a 10pt slot.
 *
 * @param props - The task's lifecycle state.
 * @returns The ring or the solid dot.
 */
function TodoMarker({ status }: { status: TodoItem['status'] }): React.JSX.Element {
  const theme = useAppTheme()
  if (status === 'in_progress') return <NativeRunningRing />
  return (
    <View
      style={{
        backgroundColor: status === 'completed' ? theme.colors.success : theme.colors.inkFaint,
        borderRadius: 3,
        height: 6,
        width: 6,
      }}
    />
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `TodoPanel .root`: an r16 menu surface with the l1 hairline and the panel
    // elevation, matching the goal bar and queue docks beside it.
    card: {
      ...theme.elevation.card,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderHairline,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    // `.body`: column, 8px between the header and the list, `6px 12px`.
    body: { flexDirection: 'column', gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
    // `.header`: one row 10px apart with the chevron trailing.
    header: { alignItems: 'center', flexDirection: 'row', gap: 10, minWidth: 0 },
    // `.lead`: a 14pt glyph slot in the tertiary tone.
    lead: { alignItems: 'center', justifyContent: 'center', width: 14 },
    // `.title`: 13/24 medium in the primary tone, never shrinks.
    title: { color: theme.colors.ink, flexShrink: 0, fontSize: 13, fontWeight: '500', lineHeight: 24 },
    // `.progress`: 13/20 regular tertiary, absorbs the remaining width.
    progress: { color: theme.colors.inkTertiary, flex: 1, fontSize: 13, lineHeight: 20, minWidth: 0 },
    chevron: { alignItems: 'center', justifyContent: 'center' },
    // `.list`: 8px between items, capped at 180 so the dock never owns the screen.
    scroll: { maxHeight: 180 },
    list: { flexDirection: 'column', gap: 8 },
    // `.item`: 10px apart, 13/20 secondary, one line each.
    item: { alignItems: 'center', flexDirection: 'row', gap: 10, minWidth: 0 },
    // `.glyph`: a 16pt marker slot, centred.
    glyph: { alignItems: 'center', height: 16, justifyContent: 'center', width: 16 },
    // `.content`: ellipsizes rather than wrapping, as the Figma strip is single-line.
    content: { color: theme.colors.inkMuted, flex: 1, fontSize: 13, lineHeight: 20, minWidth: 0 },
    pressed: { opacity: 0.62 },
  })
