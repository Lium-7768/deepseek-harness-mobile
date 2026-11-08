import { NativeActionButton } from '@/components/native-action-button'
import { NativeContextMeter } from '@/components/native-context-meter'
import { NativeIcon } from '@/components/native-icon'
import { NativeStatisticsPill } from '@/components/native-statistics-pill'
import { makeSessionStyles } from '@/components/session-screen-styles'
import { contextMeterPanel, sessionStatisticPanel, sessionStatisticsPills } from '@/components/session-stats-logic'
import { t as message } from '@/locale'
import { type SharedEventItem } from '@/shared/dsh-presentation'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { Pressable, Text, View } from 'react-native'

export function ErrorNotice({ text, onRetry }: { text: string; onRetry: () => void }): React.JSX.Element {
  const s = useThemedStyles(makeSessionStyles)
  return (
    <View style={s.errorNotice}>
      <Text style={s.error}>{text}</Text>
      <NativeActionButton
        label={message('common.reload')}
        icon="refresh-outline"
        variant="secondary"
        onPress={onRetry}
      />
    </View>
  )
}

export function UnavailableState({
  message,
  action,
  onPress,
}: {
  message: string
  action: string
  onPress: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeSessionStyles)
  return (
    <View style={s.unavailable}>
      <NativeIcon name="link-off" size={28} color={theme.colors.inkFaint} />
      <Text style={s.unavailableText}>{message}</Text>
      <NativeActionButton label={action} icon="chevron-right-outline" onPress={onPress} style={s.unavailableAction} />
    </View>
  )
}

export function ConnectionStatus({
  onPress,
  status,
}: {
  /** Re-reads the conversation; wired only while the stream is disconnected. */
  onPress?: () => void
  status: string
}): React.JSX.Element {
  const s = useThemedStyles(makeSessionStyles)
  const disconnected = status === 'disconnected'
  const label = disconnected
    ? message('settings.disconnected')
    : status === 'waiting'
      ? message('conversation.waitingForConfirmation')
      : message('conversation.connecting')
  // A healthy, running, or idle stream is already stated by the transcript's own
  // live line; the header only speaks when something needs the reader (a dropped
  // stream or a pending confirmation) and otherwise shows the dot alone.
  const needsReader = disconnected || status === 'waiting' || status === 'connecting'
  const body = (
    <>
      {/* The desktop draws no resting indicator at all; the phone shows one only
          when the stream needs the reader, so a healthy conversation keeps the
          header bare instead of carrying a permanent green dot. */}
      {needsReader ? (
        <View
          style={[
            s.statusDot,
            disconnected && s.statusOffline,
            (status === 'waiting' || status === 'connecting') && s.statusPending,
          ]}
        />
      ) : null}
      {needsReader ? (
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={s.statusText}>
          {label}
        </Text>
      ) : null}
    </>
  )
  // Only a disconnected pill is tappable: while the stream is healthy the re-read is
  // available from the list's own pull, and an always-tappable status invites misreads.
  return onPress === undefined || !disconnected ? (
    <View style={s.status}>{body}</View>
  ) : (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={message('conversation.reconnect')}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [s.status, pressed && s.pressed]}
    >
      {body}
    </Pressable>
  )
}

/**
 * Renders the composer dock that `InputBar.dock` prints below the card.
 *
 * The statistics pills and the context meter share one centred row 12px apart.
 * The row always renders: `InputBar .root:not(.hero) > .dock` reserves its height
 * so the composer does not resize when the projections land.
 *
 * @param props - Visible events, durable projections, and the meter reading.
 * @returns The dock row, empty until a reading exists.
 */
export function SessionDock({
  items,
  projectionValues,
}: {
  items: SharedEventItem[]
  projectionValues: Record<string, unknown> | undefined
}): React.JSX.Element {
  const s = useThemedStyles(makeSessionStyles)
  const pills = sessionStatisticsPills(projectionValues, items)
  const meter = contextMeterPanel(projectionValues)
  return (
    <View style={s.dock}>
      {pills.map((pill) => (
        <NativeStatisticsPill
          key={pill.label}
          panel={sessionStatisticPanel(pill.kind, projectionValues, items)}
          pill={pill}
        />
      ))}
      <NativeContextMeter panel={meter} />
    </View>
  )
}
