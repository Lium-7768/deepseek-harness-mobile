import { ConversationDisclosureContext, useConversationDisclosure } from './conversation-disclosure'
import { conversationFlowGap, conversationRowKey } from './conversation-flow'
import { NativeIcon } from '@/components/native-icon'
import { collectTurnDescendantKeys, type NativeTurnRow } from '@/components/session-turn-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import { memo, useContext } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type Props = {
  item: NativeTurnRow
  expanded?: boolean
  /** Outer flow spacing owned by continuation segments so collapsed continuations take zero height. */
  gap?: number
  onToggle?: (rowKey: string) => void
  /** Renders one member row the control reveals. */
  renderRow: (row: NativeTurnRow['rows'][number]) => React.JSX.Element
}

/**
 * Renders one completed Turn control mirroring desktop TurnProcessNodeView:
 * 33pt header with hairline bottom border, tabular monospace duration digits, and 16pt spacing into the revealed body.
 * Continuation segments share the headed control key and render only when the Turn is open.
 * Closing the Turn resets all inner step/reasoning/tool/context disclosures to collapsed.
 */
function NativeTurnGroupView({ expanded, gap = 0, item, onToggle, renderRow }: Props): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const disclosures = useContext(ConversationDisclosureContext)
  const disclosureKey = item.controlKey ?? item.rowKey
  const [storedExpanded, toggleStored] = useConversationDisclosure(disclosureKey, item.defaultOpen === true)
  const isExpanded = expanded ?? storedExpanded
  const open = item.locked || isExpanded
  if (item.continuation === true) {
    if (!open) return null
    return (
      <View style={[s.container, gap > 0 ? { paddingTop: gap } : undefined]}>
        {item.rows.map((row, index) => {
          const rowGap = index === 0 ? 0 : conversationFlowGap(row, item.rows[index - 1])
          return (
            <View key={conversationRowKey(row, index)} style={rowGap > 0 ? { paddingTop: rowGap } : undefined}>
              {renderRow(row)}
            </View>
          )
        })}
      </View>
    )
  }
  const handleToggle = () => {
    if (open && !item.locked) {
      disclosures?.collapseMany?.(item.descendantKeys ?? collectTurnDescendantKeys(item.rows))
    }
    if (onToggle) onToggle(disclosureKey)
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
        {item.durationParts !== undefined ? (
          <Text numberOfLines={1} style={s.label}>
            {message('turn.tookPrefix') + ' '}
            {item.durationParts.map((part, index) => (
              <Text key={index} style={part.numeric ? s.durationNumber : undefined}>
                {part.text}
              </Text>
            ))}
          </Text>
        ) : (
          <Text numberOfLines={1} style={s.label}>
            {item.title}
          </Text>
        )}
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
          {item.rows.map((row, index) => {
            const rowGap = index === 0 ? 0 : conversationFlowGap(row, item.rows[index - 1])
            return (
              <View key={conversationRowKey(row, index)} style={rowGap > 0 ? { paddingTop: rowGap } : undefined}>
                {renderRow(row)}
              </View>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { minWidth: 0 },
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
    durationNumber: { fontFamily: MONOSPACE_FONT, fontVariant: ['tabular-nums'] },
    body: { paddingTop: 16 },
    pressed: { opacity: 0.62 },
  })

export const NativeTurnGroup = memo(NativeTurnGroupView)
