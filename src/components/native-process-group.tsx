import { conversationRowKey } from './conversation-flow'
import type { NativeIconName } from '@/components/native-icon'
import { NativeIcon } from '@/components/native-icon'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import type { NativeProcessRow, ProcessActivity } from '@/components/session-process-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type Props = {
  item: NativeProcessRow
  /** Renders one row the disclosure reveals, so the group owns no row markup. */
  renderRow: (row: NativeConversationRow) => React.JSX.Element
  /**
   * Whether this step is open, owned by the conversation.
   *
   * The list recycles rows, so a step's disclosure cannot live in the row's own
   * state: scrolling it out of view and back would silently collapse it.
   */
  expanded: boolean
  onToggle: (rowKey: string) => void
}

/**
 * Renders one collapsible step exactly as the desktop's process group header is
 * drawn: a 16pt leading box, a 14/24 tertiary label, and no trailing control.
 *
 * The desktop swaps the activity glyph for a chevron once the group is open, and
 * adds 8pt under the header; the members indent to the same title column, so a
 * step's rows line up under the label that names them.
 *
 * @param props - The step's summary, its rows, and the row renderer.
 * @returns The collapsed or expanded step.
 */
export function NativeProcessGroup({ expanded, item, onToggle, renderRow }: Props): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  // A later step of the running Turn continues under the Turn's one header.
  if (item.header === false)
    return (
      <View style={s.container}>
        {item.rows.map((row, index) => (
          <View key={conversationRowKey(row, index)}>{renderRow(row)}</View>
        ))}
      </View>
    )
  return (
    <View style={s.container}>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={expanded ? message('process.collapse') : message('process.expand')}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={8}
        onPress={() => onToggle(item.rowKey)}
        style={({ pressed }) => [s.header, expanded && s.headerOpen, pressed && s.pressed]}
      >
        <View style={s.leading}>
          <NativeIcon
            color={theme.colors.inkTertiary}
            name={expanded ? 'chevron-up-outline' : activityIcon(item.activity)}
            size={14}
          />
        </View>
        <Text numberOfLines={1} style={s.label}>
          {item.title}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={s.body}>
          {item.rows.map((row, index) => (
            <View key={conversationRowKey(row, index)}>{renderRow(row)}</View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** The desktop's step-process glyph for one activity. */
function activityIcon(activity: ProcessActivity): NativeIconName {
  switch (activity) {
    case 'thinking':
      return 'think-outline'
    case 'read':
    case 'readImage':
      return 'deliver-doc'
    case 'write':
      return 'edit-outline'
    case 'search':
      return 'search-outline'
    case 'edit':
      return 'edit-outline'
    case 'commands':
    case 'code':
      return 'code-outline'
    case 'webSearch':
    case 'webFetch':
      return 'globe-outline'
    default:
      return 'sparkle'
  }
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { minWidth: 0, gap: 4 },
    // `ChatGroupSeat .title`: 24pt line, 6pt between the leading box and the label.
    header: { alignItems: 'center', flexDirection: 'row', minHeight: 24, minWidth: 0 },
    headerOpen: { paddingBottom: 8 },
    // `ChatGroupSeat .leading`: a 16pt box holding a 14pt glyph.
    leading: { alignItems: 'center', height: 16, justifyContent: 'center', marginRight: 6, width: 16 },
    label: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 14, lineHeight: 24, minWidth: 0 },
    // `ChatGroupSeat .body`: members share the header's title column, 4pt apart.
    body: { gap: 4 },
    pressed: { opacity: 0.62 },
  })
