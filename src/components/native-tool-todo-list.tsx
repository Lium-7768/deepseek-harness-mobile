import { NativeIcon } from '@/components/native-icon'
import type { NativeIconName } from '@/components/native-icon'
import type { TodoItem } from '@/components/tool-row-view'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/** Glyph per item state, the same three the desktop's todo row uses. */
const GLYPH: Record<TodoItem['status'], NativeIconName> = {
  completed: 'check-outline',
  in_progress: 'clock-outline',
  pending: 'checklist-outline',
}

/**
 * The list a `todo_write` call wrote, as items rather than as its argument JSON.
 *
 * A todo call's arguments are the list itself, so printing them put a wall of JSON where
 * the desktop printed the items. This is the reading surface the desktop's todo row
 * gives: one line per item, its state as the leading glyph.
 *
 * @param props.items - The items the call wrote.
 * @returns The list.
 */
export const ToolTodoList = memo(function ToolTodoList({ items }: { items: TodoItem[] }): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.list}>
      {items.map((item, index) => (
        <View key={`${String(index)}:${item.text}`} style={s.item}>
          <NativeIcon
            color={item.status === 'completed' ? theme.colors.inkMuted : theme.colors.inkTertiary}
            name={GLYPH[item.status]}
            size={14}
          />
          <Text
            style={[s.text, item.status === 'completed' && s.textDone]}
            // Long items wrap rather than forcing the row wider than the flow.
            numberOfLines={3}
          >
            {item.text}
          </Text>
        </View>
      ))}
    </View>
  )
})

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    list: { gap: theme.spacing.xxs },
    item: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.xs },
    text: { color: theme.colors.ink, flex: 1, fontSize: 13, lineHeight: 20 },
    textDone: { color: theme.colors.inkMuted, textDecorationLine: 'line-through' },
  })
