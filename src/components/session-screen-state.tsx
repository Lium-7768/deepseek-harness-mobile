import { NativeActionButton } from '@/components/native-action-button'
import { NativeContextMeter } from '@/components/native-context-meter'
import { NativeIcon } from '@/components/native-icon'
import { NativeStatisticsPill } from '@/components/native-statistics-pill'
import { makeSessionStyles } from '@/components/session-screen-styles'
import { contextMeterPanel, sessionStatisticPanel, sessionStatisticsPills } from '@/components/session-stats-logic'
import { t as message } from '@/locale'
import { type SharedEventItem } from '@/shared/dsh-presentation'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { Text, View } from 'react-native'

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

export function ConnectionStatus({ status }: { status: string }): React.JSX.Element {
  const s = useThemedStyles(makeSessionStyles)
  const disconnected = status === 'disconnected'
  const label = disconnected
    ? message('settings.disconnected')
    : status === 'idle'
      ? message('conversation.idle')
      : status === 'running'
        ? message('session.running')
        : status === 'waiting'
          ? message('conversation.waitingForConfirmation')
          : message('conversation.connecting')
  return (
    <View style={s.status}>
      <View
        style={[
          s.statusDot,
          disconnected && s.statusOffline,
          (status === 'waiting' || status === 'connecting') && s.statusPending,
        ]}
      />
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={s.statusText}>
        {label}
      </Text>
    </View>
  )
}

/**
 * Renders the composer dock that `InputBar.dock` prints below the card.
 *
 * The statistics pills and the context meter share one centred row 12px apart.
 *
 * @param props - Visible events, durable projections, and the meter reading.
 * @returns The dock row, or `null` when neither side has anything to print.
 */
export function SessionDock({
  items,
  projectionValues,
}: {
  items: SharedEventItem[]
  projectionValues: Record<string, unknown> | undefined
}): React.JSX.Element | null {
  const s = useThemedStyles(makeSessionStyles)
  const pills = sessionStatisticsPills(projectionValues, items)
  const meter = contextMeterPanel(projectionValues)
  if (pills.length === 0 && meter === undefined) return null
  return (
    <View style={s.dock}>
      {pills.map((pill) => (
        <NativeStatisticsPill
          // The panel headline repeats the pill's first reading, as the Web's
          // `.titleValue` repeats the section's headline figure.
          headline={pill.label.split(' · ')[0] ?? pill.label}
          key={pill.label}
          panel={sessionStatisticPanel(pill.kind, projectionValues, items)}
          pill={pill}
        />
      ))}
      <NativeContextMeter panel={meter} />
    </View>
  )
}
