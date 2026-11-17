import { NativeIcon } from '@/components/native-icon'
import { makeSessionStyles } from '@/components/session-screen-styles'
import { t as message } from '@/locale'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { Pressable, Text, View } from 'react-native'

/** What the control reports about the older page it requests. */
type LoadState = { pending: boolean; failed: boolean }

/**
 * The control at the top of a transcript: fetch older history, or state its start.
 *
 * One control rather than a stack, because a conversation has exactly one oldest loaded
 * row. When the Host reports nothing older, the same place states the boundary instead of
 * going blank, so the reader learns the transcript ends rather than wondering whether a
 * page failed.
 *
 * @param props.hasMore - Whether the Host reports more history.
 * @param props.state - Whether a page is in flight, and whether the last one failed.
 * @param props.onLoad - Requests one older page.
 * @returns The control, or the boundary notice.
 */
export function LoadOlderControl({
  hasMore,
  state,
  onLoad,
}: {
  hasMore: boolean
  state: LoadState
  onLoad: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeSessionStyles)
  if (!hasMore)
    return (
      <View style={s.historyStart}>
        <Text style={s.historyStartText}>{message('conversation.historyStart')}</Text>
      </View>
    )
  // The label and the icon follow the same three states, so they are decided once.
  const label = state.pending
    ? message('conversation.processingOlder')
    : state.failed
      ? message('conversation.retryLoadOlder')
      : message('conversation.loadOlder')
  return (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: state.pending }}
      disabled={state.pending}
      onPress={onLoad}
      style={({ pressed }) => [s.loadOlder, pressed && s.pressed]}
    >
      <NativeIcon
        name={state.failed ? 'refresh-outline' : 'chevron-up-outline'}
        size={16}
        color={state.failed ? theme.colors.danger : theme.colors.inkMuted}
      />
      <Text style={[s.loadOlderText, state.failed === true && s.loadOlderError]}>{label}</Text>
    </Pressable>
  )
}
