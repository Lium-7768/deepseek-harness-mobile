import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'
import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'

type NativeActionButtonProps = {
  label: string
  icon: NativeIconName
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}

/** Renders a translated action with the mobile client's shared icon and button treatment.
 * @param props - Label, icon, action state, and press handler for the button.
 * @returns A native action button.
 */
export function NativeActionButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: NativeActionButtonProps): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const surface = surfaceFor(variant, styles)
  const glyph = glyphFor(variant, theme)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, surface, style, pressed && styles.pressed]}
    >
      {loading ? <ActivityIndicator color={glyph} /> : <NativeIcon name={icon} color={glyph} size={17} />}
      <Text style={[styles.label, labelTintFor(variant, theme)]}>{label}</Text>
    </Pressable>
  )
}

/**
 * Pick the container style for a variant.
 *
 * @param variant - Button variant.
 * @param styles - The active appearance's style sheet.
 * @returns The container style.
 */
function surfaceFor(
  variant: NativeActionButtonProps['variant'],
  styles: ReturnType<typeof makeStyles>,
): StyleProp<ViewStyle> {
  if (variant === 'danger') return styles.danger
  return variant === 'secondary' ? styles.secondary : styles.primary
}

/**
 * Pick the icon and spinner colour for a variant.
 *
 * @param variant - Button variant.
 * @param theme - The active appearance.
 * @returns A colour value.
 */
function glyphFor(variant: NativeActionButtonProps['variant'], theme: AppTheme): string {
  if (variant === 'danger') return theme.colors.danger
  return variant === 'secondary' ? theme.colors.ink : theme.colors.onBrand
}

/**
 * Pick the label tint for a variant.
 *
 * @param variant - Button variant.
 * @param theme - The active appearance.
 * @returns A text style carrying the colour.
 */
function labelTintFor(variant: NativeActionButtonProps['variant'], theme: AppTheme): { color: string } {
  if (variant === 'danger') return { color: theme.colors.danger }
  return { color: variant === 'secondary' ? theme.colors.ink : theme.colors.onBrand }
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
      button: {
        alignItems: 'center',
        borderRadius: theme.radius.control,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 7,
        justifyContent: 'center',
        minHeight: 44,
        paddingHorizontal: 16,
      },
      primary: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
      secondary: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong },
      danger: { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.dangerBorder },
      label: { fontSize: 14, fontWeight: '700' },
      pressed: { opacity: 0.68 },
  })
