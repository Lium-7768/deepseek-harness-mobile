import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { StyleSheet, Text, View } from 'react-native'

/**
 * Renders the one shape every empty and unavailable list uses.
 *
 * The screens each invented their own: a centred grey sentence here, a title with
 * a button there, nothing at all in the workspace. A phone reader needs the same
 * three answers from all of them — what this is, why it is empty, and what to do
 * next — so the shape lives in one place.
 *
 * @param props - A glyph, a heading, one supporting line, and an optional action.
 * @returns The empty state.
 */
export function NativeEmptyState({
  action,
  description,
  icon,
  title,
}: {
  /** Optional next step; omission leaves a purely informational state. */
  action?: { label: string; icon: NativeIconName; onPress: () => void }
  /** One sentence under the heading; keep it to a line of what and why. */
  description?: string
  icon: NativeIconName
  title: string
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.state}>
      <NativeIcon name={icon} size={26} color={theme.colors.inkTertiary} />
      <Text style={s.title}>{title}</Text>
      {description === undefined ? null : <Text style={s.description}>{description}</Text>}
      {action === undefined ? null : (
        <NativeActionButton
          icon={action.icon}
          label={action.label}
          onPress={action.onPress}
          variant="secondary"
          style={s.action}
        />
      )}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Centred in whatever room the screen has, capped so a wide tablet does not
    // stretch one sentence across the viewport.
    state: { alignItems: 'center', gap: 8, justifyContent: 'center', padding: 24 },
    title: { color: theme.colors.ink, fontSize: 15, fontWeight: '600', lineHeight: 22, textAlign: 'center' },
    description: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
    action: { marginTop: 6, minWidth: 160 },
  })
