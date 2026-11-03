import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'

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
  const glyph = disabled && variant === 'primary' ? theme.colors.inkMuted : glyphFor(variant, theme)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, surface, style, stateStyle(variant, pressed, disabled, styles)]}
    >
      {loading ? <ActivityIndicator color={glyph} /> : <NativeIcon name={icon} color={glyph} size={17} />}
      <Text
        style={[
          styles.label,
          labelTintFor(variant, theme),
          disabled && variant === 'primary' && { color: theme.colors.inkMuted },
        ]}
      >
        {label}
      </Text>
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
 * Pick the pressed or disabled treatment for a variant.
 *
 * The desktop states are separate fills rather than an opacity change, so the
 * label keeps its contrast while the surface moves.
 *
 * @param variant - Button variant.
 * @param pressed - Whether the pointer is down.
 * @param disabled - Whether the button cannot run.
 * @param styles - The active appearance's style sheet.
 * @returns The state style, if any.
 */
function stateStyle(
  variant: NativeActionButtonProps['variant'],
  pressed: boolean,
  disabled: boolean,
  styles: ReturnType<typeof makeStyles>,
): StyleProp<ViewStyle> {
  if (disabled) {
    if (variant === 'danger') return styles.dangerDisabled
    return variant === 'secondary' ? styles.secondaryDisabled : styles.primaryDisabled
  }
  if (!pressed) return undefined
  if (variant === 'danger') return styles.dangerPressed
  return variant === 'secondary' ? styles.secondaryPressed : styles.primaryPressed
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
      paddingVertical: 8,
    },
    // The desktop's primary action fills with `button-primary-fill` and swaps to
    // `button-primary-hover` while pressed; nothing fades.
    primary: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
    primaryPressed: { backgroundColor: theme.colors.brandHover, borderColor: theme.colors.brandHover },
    primaryDisabled: { backgroundColor: theme.colors.primaryDimmed, borderColor: theme.colors.primaryDimmed },
    // Its neutral raised control is `button-elevated-fill` behind a `border-l3`
    // hairline, `radius-md`, 14/500 label (SidebarRoot.module.css:415).
    secondary: {
      backgroundColor: theme.colors.elevatedFill,
      borderColor: theme.colors.borderL3,
      borderRadius: theme.radius.md,
    },
    secondaryPressed: { backgroundColor: theme.colors.surfaceMuted },
    secondaryDisabled: { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
    danger: { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.dangerBorder },
    dangerPressed: { opacity: 0.68 },
    dangerDisabled: { opacity: 0.5 },
    label: { flexShrink: 1, textAlign: 'center', fontSize: 14, fontWeight: '500' },
    pressed: { opacity: 1 },
  })
