import { useConversationDisclosure } from './conversation-disclosure'
import { conversationRowKey } from './conversation-flow'
import { NativeIcon } from '@/components/native-icon'
import type { NativeTurnRow } from '@/components/session-turn-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type Props = {
  item: NativeTurnRow
  expanded?: boolean
  onToggle?: (rowKey: string) => void
  /** Renders one member row the control reveals. */
  renderRow: (row: NativeTurnRow['rows'][number]) => React.JSX.Element
}

/**
 * Renders one completed Turn as a single control.
 *
 * The desktop folds a settled Turn's reasoning, tool calls, and retries behind a
 * 33pt row reading `已完成，用时 8分52秒`; the Assistant's replies stay visible
 * below it, and the row ends in a hairline. This is the native form of that row,
 * with individual tool and reasoning disclosures inside.
 *
 * A failed or stopped Turn keeps its content open and drops the chevron: there
 * is nothing the reader could collapse.
 *
 * @param props - The Turn, its open state, and the member renderer.
 * @returns The collapsed or expanded Turn.
 */
function NativeTurnGroupView({ expanded, item, onToggle, renderRow }: Props): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [storedExpanded, toggleStored] = useConversationDisclosure(item.rowKey)
  const isExpanded = expanded ?? storedExpanded
  const open = item.locked || isExpanded
  const handleToggle = () => {
    if (onToggle) onToggle(item.rowKey)
    else toggleStored()
  }
  return (
    <View style={s.container}>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={open ? message('turn.collapse') : message('turn.expand')}
        accessibilityRole="button"
        accessibilityState={{ disabled: item.locked, expanded: open }}
        disabled={item.locked}
        hitSlop={6}
        onPress={handleToggle}
        style={({ pressed }) => [s.header, pressed && s.pressed]}
      >
        <Text numberOfLines={1} style={s.label}>
          {item.title}
        </Text>
        {item.locked ? null : (
          <NativeIcon
            color={theme.colors.inkTertiary}
            name={open ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={14}
          />
        )}
      </Pressable>
      {open ? (
        <View style={s.body}>
          {item.rows.map((row, index) => (
            <View key={conversationRowKey(row, index)}>{renderRow(row)}</View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { marginBottom: 2 },
    // `ph4WDG_root`: 33pt tall at 14/400 on a 24px line, trailing 8pt of pad and
    // a hairline under the row.
    header: {
      alignItems: 'center',
      borderBottomColor: theme.colors.borderL2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 4,
      minHeight: 33,
      paddingBottom: 8,
    },
    label: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 14, lineHeight: 24 },
    body: { paddingBottom: 6, paddingTop: 8, gap: 4 },
    pressed: { opacity: 0.62 },
  })

/**
 * One Turn in a scrolling transcript.
 *
 * Memoized because a transcript re-renders on every streamed chunk: without it each
 * chunk rebuilt every mounted Turn, and a Turn carries its own disclosure and header.
 * The props are compared by identity, which is why the caller keeps `onToggle` and
 * `renderRow` stable.
 */
export const NativeTurnGroup = memo(NativeTurnGroupView)
