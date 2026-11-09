import type { TurnRailMark } from '@/components/session-turn-rail-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { Pressable, StyleSheet, View } from 'react-native'

/**
 * The desktop's turn rail: one mark per Turn down the right edge of the transcript.
 *
 * The Web draws the rail as a fixed-pitch column of 10px marks and scrolls it
 * independently; on a phone the rail sits over the transcript's right margin and
 * holds the whole window without its own scroll, because a thumb cannot aim at a
 * mark inside a list that also scrolls. Tapping a mark jumps to that Turn.
 *
 * @param props.marks - Marks in list order.
 * @param props.activeTurn - Turn currently under the reader, from `activeRailMark`.
 * @param props.onJump - Called with the row index a mark owns.
 * @returns The rail, or `null` when one Turn would make it pointless.
 */
export function NativeTurnRail({
  activeTurn,
  hasOlderTurns,
  marks,
  onJump,
  onLoadOlder,
  rowCount,
}: {
  activeTurn?: number
  /** Whether history above this window exists, so the rail can offer to page it in. */
  hasOlderTurns?: boolean
  marks: readonly TurnRailMark[]
  onJump: (index: number) => void
  onLoadOlder?: () => void
  /** Rows the list is showing, so a mark sits where its Turn sits. */
  rowCount: number
}): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  if ((marks.length < 2 && hasOlderTurns !== true) || rowCount < 2) return null
  return (
    <View accessibilityRole="adjustable" pointerEvents="box-none" style={s.rail}>
      {/* The desktop's rail covers the whole session because it can page a Turn in; the
          phone only holds a window, so its oldest mark is the way to reach further back. */}
      {hasOlderTurns === true && onLoadOlder !== undefined ? (
        <Pressable
          accessibilityLabel={message('conversation.loadOlder')}
          accessibilityRole="button"
          hitSlop={6}
          onPress={onLoadOlder}
          style={({ pressed }) => [s.markOlder, pressed ? s.markPressed : null]}
        />
      ) : null}
      {marks.map((mark) => (
        <Pressable
          accessibilityLabel={format('conversation.jumpToTurn', { turn: mark.turn })}
          accessibilityRole="button"
          accessibilityState={{ selected: mark.turn === activeTurn }}
          hitSlop={4}
          key={mark.turn}
          onPress={() => onJump(mark.index)}
          // A mark sits at its Turn's share of the transcript, the way a scroll bar
          // sits at its offset: position carries the distance, not the pitch.
          style={({ pressed }) => [
            s.mark,
            { top: `${(mark.index / Math.max(1, rowCount - 1)) * 100}%` },
            mark.turn === activeTurn ? s.markActive : null,
            pressed ? s.markPressed : null,
          ]}
        />
      ))}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Sits inside the transcript's right margin, clear of the scroll indicator.
    rail: {
      alignItems: 'center',
      bottom: 72,
      justifyContent: 'center',
      position: 'absolute',
      right: 2,
      top: 72,
      width: 16,
    },
    // `TurnNavigator .mark`: a 2x6 bar, tertiary at rest and the brand ink when active.
    mark: { backgroundColor: theme.colors.inkFaint, borderRadius: 2, height: 6, position: 'absolute', width: 2 },
    markActive: { backgroundColor: theme.colors.inkMuted, height: 14 },
    markPressed: { backgroundColor: theme.colors.accent },
    // Sits above the first mark, at the rail's top edge.
    markOlder: {
      backgroundColor: theme.colors.inkTertiary,
      borderRadius: 2,
      height: 2,
      position: 'absolute',
      top: 0,
      width: 8,
    },
  })
