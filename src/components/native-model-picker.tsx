import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeEffortSlider } from '@/components/native-effort-slider'
import { NativeIcon } from '@/components/native-icon'
import { reasoningEffortLabel } from '@/components/model-picker-logic'
import { selectedCatalogModel, splitModelId } from '@/components/session-selection-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileModelCatalogFailure, MobileModelProviderGroup } from '@/types/mobile'
import { useEffect, useState, type RefObject } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

export type NativeModelChoice = { provider: string; model: string }

/** One persistent card: step between model routes and adjust only host-published effort stops. */
export function NativeModelPicker({
  disabled = false,
  effort,
  groups,
  failures = [],
  routable,
  loading = false,
  failed = false,
  notice,
  onClose,
  onSelectEffort,
  onSelectModel,
  open,
  selection,
  anchorRef,
}: {
  disabled?: boolean
  effort?: string
  groups: MobileModelProviderGroup[]
  failures?: MobileModelCatalogFailure[]
  routable?: boolean
  loading?: boolean
  failed?: boolean
  notice?: string
  onClose(): void
  onSelectEffort?: (effort: string) => void
  onSelectModel(choice: NativeModelChoice): void
  open: boolean
  selection?: NativeModelChoice
  anchorRef?: RefObject<View | null>
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [previewEffort, setPreviewEffort] = useState<string>()
  const current = selectedCatalogModel(groups, selection)
  const routes = groups.flatMap((group) => group.models.map((model) => ({ provider: group.id, model: model.id })))
  const currentIndex = routes.findIndex(
    (route) => route.provider === selection?.provider && route.model === selection?.model,
  )
  const provider = groups.find((group) => group.id === selection?.provider)
  const choices = current?.reasoning?.efforts ?? []
  const effectiveEffort = effort ?? current?.reasoning?.defaultEffort
  const displayEffort = previewEffort ?? effectiveEffort
  const label = current
    ? current.name === current.id
      ? splitModelId(current.id).leaf
      : current.name
    : selection
      ? splitModelId(selection.model).leaf
      : message('model.selectTitle')
  const resetEffort = current?.reasoning?.defaultEffort
  const canReset =
    !disabled &&
    onSelectEffort !== undefined &&
    resetEffort !== undefined &&
    resetEffort !== effectiveEffort &&
    choices.some((choice) => choice.id === resetEffort)
  const canAdjust = !disabled && choices.length > 1 && onSelectEffort !== undefined
  const previousIndex = currentIndex < 0 ? routes.length - 1 : currentIndex - 1
  const nextIndex = currentIndex + 1
  const choose = (index: number): void => {
    const route = routes[index]
    if (disabled || !route || index === currentIndex) return
    setPreviewEffort(undefined)
    onSelectModel(route)
  }
  useEffect(() => {
    setPreviewEffort(undefined)
  }, [open, selection?.provider, selection?.model, effort])
  if (!open) return null
  return (
    <NativeAnchoredPanel open onClose={onClose} anchorRef={anchorRef}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.card}>
        <View style={s.header}>
          <View style={s.balance} />
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={2} style={s.effortTitle}>
            {choices.length > 0
              ? displayEffort
                ? reasoningEffortLabel(displayEffort, choices)
                : message('model.providerDefault')
              : loading
                ? message('common.loading')
                : current
                  ? message('model.noReasoningEffort')
                  : message('model.noAvailableModels')}
          </Text>
          {disabled ? (
            <View style={s.balance}>
              <ActivityIndicator
                accessibilityLabel={message('composer.switching')}
                color={theme.colors.inkMuted}
                size="small"
              />
            </View>
          ) : resetEffort !== undefined && choices.some((choice) => choice.id === resetEffort) ? (
            <Pressable
              accessibilityLabel={message('model.resetEffort')}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canReset }}
              disabled={!canReset}
              onPress={() => {
                if (canReset) onSelectEffort?.(resetEffort)
              }}
              style={[s.icon, !canReset && s.disabled]}
            >
              <NativeIcon name="refresh-outline" size={18} color={theme.colors.inkTertiary} />
            </Pressable>
          ) : (
            <View style={s.balance} />
          )}
        </View>
        <View style={s.modelRow}>
          <Pressable
            accessibilityLabel={message('model.previousModel')}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || previousIndex < 0 || previousIndex >= routes.length }}
            disabled={disabled || previousIndex < 0 || previousIndex >= routes.length}
            onPress={() => choose(previousIndex)}
            style={[s.icon, (disabled || previousIndex < 0 || previousIndex >= routes.length) && s.disabled]}
          >
            <NativeIcon name="chevron-left-outline" size={16} color={theme.colors.inkTertiary} />
          </Pressable>
          <View accessible accessibilityLabel={format('composer.selectModel', { label })} style={s.modelCopy}>
            <Text numberOfLines={2} maxFontSizeMultiplier={2} style={s.modelName}>
              {label}
            </Text>
            {provider ? (
              <Text numberOfLines={1} maxFontSizeMultiplier={1.5} style={s.provider}>
                {provider.name}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel={message('model.nextModel')}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || nextIndex >= routes.length }}
            disabled={disabled || nextIndex >= routes.length}
            onPress={() => choose(nextIndex)}
            style={[s.icon, (disabled || nextIndex >= routes.length) && s.disabled]}
          >
            <NativeIcon name="chevron-right-outline" size={16} color={theme.colors.inkTertiary} />
          </Pressable>
        </View>
        {routes.length > 1 ? (
          <Text maxFontSizeMultiplier={1.5} style={s.position}>
            {format('model.position', { current: Math.max(0, currentIndex + 1), total: routes.length })}
          </Text>
        ) : null}
        <NativeEffortSlider
          key={JSON.stringify(selection)}
          choices={choices}
          value={effectiveEffort}
          disabled={!canAdjust}
          onPreview={setPreviewEffort}
          onCommit={(value) => {
            if (canAdjust && value !== effectiveEffort) onSelectEffort?.(value)
          }}
        />
        {failed ? (
          <Text accessibilityRole="alert" style={s.error}>
            {message('model.catalogFailed')}
          </Text>
        ) : null}
        {routable === false ? (
          <Text accessibilityRole="alert" style={s.error}>
            {message('model.routingUnavailable')}
          </Text>
        ) : null}
        {failures.map((failure) => (
          <Text key={failure.id} style={s.error}>
            {format('model.providerUnavailable', { name: failure.name })}
          </Text>
        ))}
        {notice ? <Text style={s.notice}>{notice}</Text> : null}
      </ScrollView>
    </NativeAnchoredPanel>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10, gap: 4 },
    header: { flexDirection: 'row', alignItems: 'center' },
    effortTitle: {
      flex: 1,
      minWidth: 0,
      color: theme.colors.accentText,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '500',
      textAlign: 'center',
    },
    modelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    modelCopy: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
    modelName: { color: theme.colors.inkMuted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
    provider: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    position: { color: theme.colors.inkTertiary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
    balance: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    icon: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill },
    disabled: { opacity: 0.4 },
    notice: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18, paddingVertical: 4 },
    error: { color: theme.colors.danger, fontSize: 12, lineHeight: 18, paddingVertical: 4 },
  })
