import { useConversationDisclosure } from './conversation-disclosure'
import { conversationRowKey } from './conversation-flow'
import type { NativeIconName } from '@/components/native-icon'
import { NativeIcon } from '@/components/native-icon'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import type { NativeProcessRow, ProcessActivity } from '@/components/session-process-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type Props = {
  item: NativeProcessRow
  /** Renders one row the disclosure reveals, so the group owns no row markup. */
  renderRow: (row: NativeConversationRow) => React.JSX.Element
  /** Optional controlled expanded state; defaults to screen-owned disclosure context. */
  expanded?: boolean
  onToggle?: (rowKey: string) => void
}

/**
 * Renders one collapsible step group mirroring desktop `ChatGroupSeat.tsx` and `ChatGroupSeat.module.css`:
 * 16pt leading box (swaps activity glyph for chevron-up while open), 14/24 tertiary label,
 * exact 8pt open header bottom padding, and 4pt member gaps. Members render in normal flow
 * (rather than an inner vertical ScrollView) so touch scrolling inside the parent inverted
 * FlatList never traps gestures or creates 3-level nested scrollports.
 * When `item.flat` is true (desktop `detailed` running Turn or `verbose` mode), renders members
 * directly without a header.
 */
export const NativeProcessGroup = memo(function NativeProcessGroup({
  expanded,
  item,
  onToggle,
  renderRow,
}: Props): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [storedExpanded, toggleStored] = useConversationDisclosure(item.rowKey)
  const isExpanded = expanded ?? storedExpanded
  const handleToggle = () => {
    if (onToggle) onToggle(item.rowKey)
    else toggleStored()
  }
  // Flat mode (`detailed` running Turn or `verbose` mode): uncapped members without a header.
  if (item.flat === true || item.header === false) {
    return (
      <View style={s.body}>
        {item.rows.map((row, index) => (
          <View key={conversationRowKey(row, index)}>{renderRow(row)}</View>
        ))}
      </View>
    )
  }
  return (
    <View style={s.container}>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={isExpanded ? message('process.collapse') : message('process.expand')}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        hitSlop={8}
        onPress={handleToggle}
        style={({ pressed }) => [s.header, isExpanded && s.headerOpen, pressed && s.pressed]}
      >
        <View style={s.leading}>
          <NativeIcon
            color={theme.colors.inkTertiary}
            name={isExpanded ? 'chevron-up-outline' : activityIcon(item.activity)}
            size={14}
          />
        </View>
        <Text numberOfLines={1} style={s.label}>
          {item.title}
        </Text>
      </Pressable>
      {isExpanded ? (
        <View style={s.body}>
          {item.rows.map((row, index) => (
            <View key={conversationRowKey(row, index)}>{renderRow(row)}</View>
          ))}
        </View>
      ) : null}
    </View>
  )
})

/** Desktop `ChatGroupSeat.tsx` `PROCESS_ICONS` mapping onto mobile icons. */
function activityIcon(activity: ProcessActivity): NativeIconName {
  switch (activity) {
    case 'thinking':
      return 'think-outline'
    case 'read':
    case 'readImage':
    case 'webFetch':
      return 'deliver-doc'
    case 'write':
    case 'edit':
      return 'edit-outline'
    case 'search':
      return 'search-outline'
    case 'commands':
    case 'code':
      return 'code-outline'
    case 'webSearch':
      return 'globe-outline'
    case 'subagents':
      return 'agent-preset-outline'
    case 'plan':
      return 'plan-outline'
    case 'questions':
      return 'warning-outline'
    case 'context':
      return 'context'
    default:
      return 'sparkle'
  }
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // No extra container gap: open header owns the exact 8pt spacing to the body (`ChatGroupSeat.module.css`).
    container: { minWidth: 0 },
    header: { alignItems: 'center', flexDirection: 'row', minHeight: 24, minWidth: 0 },
    headerOpen: { paddingBottom: 8 },
    leading: { alignItems: 'center', height: 16, justifyContent: 'center', marginRight: 6, width: 16 },
    label: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 14, lineHeight: 24, minWidth: 0 },
    body: { gap: 4 },
    pressed: { opacity: 0.62 },
  })
