import { ActivityIndicator } from 'react-native'
import { NativeIcon } from '@/components/native-icon'
import { NativeListRow } from '@/components/native-list'
import { useAppTheme } from '@/theme/hooks'
import { t as message } from '@/locale'

type NativeSelectionRowProps = {
  title: string
  description?: string
  selected: boolean
  disabled?: boolean
  preserveDisabledReadability?: boolean
  loading?: boolean
  onPress?: () => void
  accessibilityLabel?: string
}

/**
 * Renders one native radio-like selection row used by model, mode, and default-setting pickers.
 * @param props - Display, interaction, selected-state, and loading-state values for the option.
 * @returns A touch-safe selectable native list row.
 */
export function NativeSelectionRow({
  title,
  description,
  selected,
  disabled = false,
  preserveDisabledReadability = false,
  loading = false,
  onPress,
  accessibilityLabel,
}: NativeSelectionRowProps): React.JSX.Element {
  const theme = useAppTheme()
  return (
    <NativeListRow
      accessibilityLabel={accessibilityLabel ?? `${title}${selected ? message('common.selectedSuffix') : ''}${disabled ? message('common.disabledSuffix') : ''}`}
      accessibilityRole="radio"
      description={description}
      disabled={disabled}
      multiline
      onPress={onPress}
      preserveDisabledReadability={preserveDisabledReadability}
      right={
        loading ? (
          <ActivityIndicator color={theme.colors.inkFaint} />
        ) : selected ? (
          <NativeIcon name="check" color={theme.colors.accent} size={20} />
        ) : null
      }
      selected={selected}
      title={title}
    />
  )
}
