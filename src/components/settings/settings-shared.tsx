import { usesStackedFields } from '@/components/native-layout'
import { mobileErrorMessage } from '@/api/mobile-api'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { NativeSection } from '@/components/native-list'
import { NativeMenuPanel } from '@/components/native-menu-panel'
import { type NativeModelSelection } from '@/components/native-model-selection'
import { NativeSelectionRow } from '@/components/native-selection'
import { format, t as message } from '@/locale'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileSettingsNamespaceView, MobileSettingsPayload } from '@/types/mobile'
import { useWindowDimensions, ActivityIndicator, Pressable, Text, View } from 'react-native'

import { makeSettingsStyles } from '@/components/settings/settings-styles'

export interface SettingsPicker {
  title: string
  value: string | undefined
  options: ReadonlyArray<{ value: string; label: string; description?: string; disabled?: boolean }>
  onSelect: (value: string) => void
}

/** Appearance choices the desktop offers; the phone renders them read-only. */
export const APPEARANCES = [
  { id: 'light', icon: 'light-outline' as const, label: 'settings.appearanceLight' as const },
  { id: 'dark', icon: 'dark-outline' as const, label: 'settings.appearanceDark' as const },
  { id: 'system', icon: 'followsystem-outline' as const, label: 'settings.appearanceSystem' as const },
] as const

/** The permission presets a new session may default to, in ascending reach. */
export const PERMISSION_CHOICES = ['read-only', 'workspace-write', 'danger-full-access'] as const

/**
 * Names one permission preset with the desktop's wording.
 *
 * @param permission - the preset id.
 * @returns its display name.
 */
export function permissionLabel(permission: string): string {
  if (permission === 'read-only') return message('settings.permissionReadOnlyLabel')
  if (permission === 'danger-full-access') return message('settings.permissionFullLabel')
  return message('settings.permissionWorkspaceLabel')
}

/**
 * One settings row: label and description on the left, the current value on the
 * right, and a divider under it — the desktop Settings row at phone width.
 *
 * @param label - the row's name.
 * @param description - supporting line under the name.
 * @param value - the control's current text.
 * @param onPress - opens the row's choices; omit for a read-only row.
 * @param disabled - dims the row and blocks the press.
 */
export function SettingsFieldRow({
  label,
  description,
  value,
  onPress,
  disabled = false,
}: {
  label: string
  description?: string
  value: string
  onPress?: () => void
  disabled?: boolean
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeSettingsStyles)
  const { width, fontScale } = useWindowDimensions()
  const stacked = usesStackedFields(width, fontScale)
  const inactive = disabled || onPress === undefined
  return (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityRole={onPress === undefined ? undefined : 'button'}
      accessibilityLabel={format('settings.fieldAccessibilityLabel', { label, value })}
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [styles.field, stacked && styles.fieldStacked, pressed && styles.pressed]}
    >
      <View style={[styles.fieldText, stacked && styles.fieldTextStacked]}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {description === undefined ? null : <Text style={styles.fieldDescription}>{description}</Text>}
      </View>
      <View style={[styles.select, stacked && styles.selectStacked, inactive && styles.selectDisabled]}>
        <Text numberOfLines={1} style={styles.selectText}>
          {value}
        </Text>
        {onPress === undefined ? null : (
          <NativeIcon name="chevron-down-outline" color={theme.colors.inkMuted} size={16} />
        )}
      </View>
    </Pressable>
  )
}

/**
 * Renders the open picker as a bottom sheet of choices.
 *
 * @param picker - the open picker, or undefined when none is open.
 * @param onClose - dismisses the sheet.
 */
export function ChoiceSheet({
  picker,
  onClose,
}: {
  picker: SettingsPicker | undefined
  onClose: () => void
}): React.JSX.Element {
  return (
    <NativeMenuPanel
      open={picker !== undefined}
      title={picker?.title}
      onClose={onClose}
      rowRole="select"
      onSelect={(value) => picker?.onSelect(value)}
      groups={[
        {
          options: (picker?.options ?? []).map((option) => ({
            ...option,
            selected: option.value === picker?.value,
          })),
        },
      ]}
    />
  )
}

export function OptionSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <NativeSection description={description} title={title}>
      {children}
    </NativeSection>
  )
}

export function OptionRow({
  label,
  description,
  selected,
  disabled,
  onPress,
}: {
  label: string
  description: string
  selected: boolean
  disabled: boolean
  onPress: () => void
}): React.JSX.Element {
  return (
    <NativeSelectionRow
      description={description}
      disabled={disabled}
      onPress={onPress}
      selected={selected}
      title={label}
    />
  )
}

export function ReadOnlySetting({
  title,
  value,
  detail,
}: {
  title: string
  value: string
  detail: string
}): React.JSX.Element {
  const styles = useThemedStyles(makeSettingsStyles)
  return (
    <View accessible accessibilityLabel={`${title}：${value}。${detail}`} style={styles.readOnlyBlock}>
      <View style={styles.readOnlyHead}>
        <Text style={styles.readOnlyTitle}>{title}</Text>
        <Text style={styles.muted}>{value}</Text>
      </View>
      <Text style={styles.readOnlyDetail}>{detail}</Text>
    </View>
  )
}
export function CenteredState({ text }: { text: string }): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeSettingsStyles)
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.colors.accent} />
      <Text style={styles.muted}>{text}</Text>
    </View>
  )
}

export function ErrorState({
  error,
  fallback,
  onRetry,
}: {
  error: unknown
  fallback: string
  onRetry?: () => void
}): React.JSX.Element {
  const styles = useThemedStyles(makeSettingsStyles)
  return (
    <View style={styles.center}>
      <Text style={styles.error}>{mobileErrorMessage(error, fallback)}</Text>
      {onRetry ? (
        <NativeActionButton
          label={message('common.reload')}
          icon="refresh-outline"
          variant="secondary"
          onPress={onRetry}
        />
      ) : null}
    </View>
  )
}

export function QueryErrorNotice({ text, onRetry }: { text: string; onRetry: () => void }): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeSettingsStyles)
  return (
    <View accessibilityRole="alert" style={styles.queryError}>
      <NativeIcon name="warning-outline" color={theme.colors.danger} size={17} />
      <View style={styles.queryErrorBody}>
        <Text style={styles.error}>{text}</Text>
        <NativeActionButton
          label={message('common.reload')}
          icon="refresh-outline"
          variant="secondary"
          onPress={onRetry}
        />
      </View>
    </View>
  )
}

export function namespace(
  payload: MobileSettingsPayload | undefined,
  ns: string,
): MobileSettingsNamespaceView | undefined {
  return payload?.namespaces.find((item) => item.ns === ns)
}

export function namespaceValue(payload: MobileSettingsPayload | undefined, ns: string): unknown {
  return namespace(payload, ns)?.value
}

export function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

export function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function readModelSelection(value: unknown): NativeModelSelection | undefined {
  const record = readRecord(value)
  const provider = readString(record?.provider)
  const model = readString(record?.model)
  return provider === undefined || model === undefined ? undefined : { provider, model }
}

export function themeLabel(value: string): string {
  if (value === 'dark') return message('settings.themeDark')
  if (value === 'system') return message('settings.themeSystem')
  return message('settings.themeLight')
}
