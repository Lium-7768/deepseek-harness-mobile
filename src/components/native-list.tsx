import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import type { ReactNode } from 'react'
import type { AccessibilityRole } from 'react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

/**
 * Groups rows under one heading and one bordered card.
 *
 * The optional description sits above the card, which keeps prose out of the
 * bordered surface the rows share.
 * @param props - Heading, optional section-level description, and the rows.
 * @returns A headed section card.
 */
export function NativeSection({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: ReactNode
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

type NativeListRowProps = {
  title: string
  description?: string
  left?: ReactNode
  right?: ReactNode
  selected?: boolean
  disabled?: boolean
  preserveDisabledReadability?: boolean
  onPress?: () => void
  accessibilityLabel?: string
  accessibilityRole?: AccessibilityRole
  multiline?: boolean
}

export function NativeListRow({
  title,
  description,
  left,
  right,
  selected = false,
  disabled = false,
  preserveDisabledReadability = false,
  onPress,
  accessibilityLabel,
  accessibilityRole = 'button',
  multiline = false,
}: NativeListRowProps): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const subdued = disabled && !preserveDisabledReadability
  const content = (
    <>
      <View style={[styles.left, multiline && styles.leftMultiline]}>
        {left ? <View style={[styles.leading, multiline && styles.leadingMultiline]}>{left}</View> : null}
        <View style={styles.copy}>
          <Text numberOfLines={multiline ? undefined : 1} style={[styles.title, subdued && styles.disabledText]}>
            {title}
          </Text>
          {description ? (
            <Text
              numberOfLines={multiline ? undefined : 2}
              style={[styles.description, subdued && styles.disabledText]}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={[styles.trailing, multiline && styles.trailingMultiline]}>{right}</View> : null}
    </>
  )
  if (!onPress)
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, ...(accessibilityRole === 'radio' ? { checked: selected } : { selected }) }}
        style={[styles.row, multiline && styles.rowMultiline, selected && styles.selected, subdued && styles.disabled]}
      >
        {content}
      </View>
    )
  return (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled, ...(accessibilityRole === 'radio' ? { checked: selected } : { selected }) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        multiline && styles.rowMultiline,
        selected && styles.selected,
        subdued && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    section: { gap: theme.spacing.xs, marginBottom: theme.spacing.lg },
    sectionTitle: {
      color: theme.colors.inkMuted,
      fontSize: theme.typography.caption,
      fontWeight: '600',
      paddingHorizontal: theme.spacing.sm,
    },
    sectionDescription: {
      color: theme.colors.inkMuted,
      fontSize: theme.typography.caption,
      lineHeight: 17,
      paddingHorizontal: theme.spacing.sm,
    },
    sectionBody: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: theme.touch.minTarget,
      paddingHorizontal: theme.spacing.md,
    },
    rowMultiline: { alignItems: 'flex-start', paddingVertical: theme.spacing.sm },
    left: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
    leftMultiline: { alignItems: 'flex-start' },
    leading: { alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.sm, width: 24 },
    leadingMultiline: { marginTop: 2 },
    copy: { flex: 1, gap: theme.spacing.xxs, minWidth: 0 },
    // `Menu.module.css` item: 13/400 on a 20px line in label-primary; the
    // supporting line under it is 12/400 on 16 in label-caption.
    title: { color: theme.colors.ink, fontSize: 13, fontWeight: '400', lineHeight: 20 },
    description: { color: theme.colors.inkFaint, fontSize: 12, lineHeight: 16 },
    trailing: { alignItems: 'center', justifyContent: 'center', marginLeft: theme.spacing.sm },
    trailingMultiline: { marginTop: 2 },
    // `Menu.module.css` marks the chosen row with the hover fill (`selectedFill`),
    // not an accent tint, so a picked row reads as a resting choice.
    selected: { backgroundColor: theme.colors.interactiveHover },
    // `.item:disabled` dims to 0.4.
    disabled: { opacity: 0.4 },
    // `.item:disabled` dims the whole row to 0.4 and leaves the label on
    // label-primary, so the title still outranks its description. Recolouring the
    // text instead inverted that hierarchy: the caption read darker than the title.
    disabledText: { color: theme.colors.ink },
    pressed: { opacity: 0.68 },
  })
