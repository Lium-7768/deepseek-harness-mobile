import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeEffortSlider } from '@/components/native-effort-slider'
import { NativeIcon } from '@/components/native-icon'
import { NativeModelDirectory } from '@/components/native-model-directory'
import { reasoningEffortLabel } from '@/components/model-picker-logic'
import { selectedCatalogModel, splitModelId } from '@/components/session-selection-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileModelCatalogFailure, MobileModelProviderGroup } from '@/types/mobile'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

export type NativeModelChoice = { provider: string; model: string }

/** Codex-style effort card with a searchable, grouped model drill-down. */
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
  onRetry,
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
  onRetry?: () => Promise<unknown>
  open: boolean
  selection?: NativeModelChoice
  anchorRef?: RefObject<View | null>
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const [previewEffort, setPreviewEffort] = useState<string>()
  const [retryPending, setRetryPending] = useState(false)
  const retrying = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const current = selectedCatalogModel(groups, selection)
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
  const hasCatalogFailure = failed || routable === false || failures.length > 0
  const retry = async (): Promise<void> => {
    if (!onRetry || retrying.current || loading || disabled) return
    retrying.current = true
    setRetryPending(true)
    try {
      await onRetry()
    } catch {
      // Query errors remain visible in the directory; a second alert is redundant.
    } finally {
      retrying.current = false
      if (mounted.current) setRetryPending(false)
    }
  }
  const status = (
    <>
      {loading ? <Text style={s.notice}>{message('common.loading')}</Text> : null}
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
      {onRetry && hasCatalogFailure ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={message('model.retryCatalog')}
          accessibilityState={{ disabled: disabled || loading || retryPending, busy: loading || retryPending }}
          disabled={disabled || loading || retryPending}
          onPress={() => void retry()}
          style={s.retry}
        >
          {loading || retryPending ? (
            <ActivityIndicator size="small" color={theme.colors.inkMuted} />
          ) : (
            <NativeIcon name="refresh-outline" size={16} color={theme.colors.inkMuted} />
          )}
          <Text style={s.retryText}>{message(loading || retryPending ? 'common.loading' : 'model.retryCatalog')}</Text>
        </Pressable>
      ) : null}
    </>
  )
  useEffect(() => {
    if (!open) {
      setDirectoryOpen(false)
      setPreviewEffort(undefined)
    }
  }, [open])
  useEffect(() => setPreviewEffort(undefined), [selection?.provider, selection?.model, effort])
  if (!open) return null
  return (
    <NativeAnchoredPanel open onClose={onClose} anchorRef={anchorRef}>
      {directoryOpen ? (
        <NativeModelDirectory
          groups={groups}
          selection={selection}
          disabled={disabled}
          loading={loading}
          status={status}
          onBack={() => setDirectoryOpen(false)}
          onSelect={(choice) => {
            if (disabled) return
            const entry = selectedCatalogModel(groups, choice)
            if (entry && (choice.provider !== selection?.provider || choice.model !== selection?.model)) {
              setPreviewEffort(undefined)
              const defaultEffort = entry.reasoning?.defaultEffort
              onSelectModel({ ...choice, ...(defaultEffort === undefined ? {} : { reasoningEffort: defaultEffort }) })
            }
            setDirectoryOpen(false)
          }}
        />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.card}>
          <View style={s.header}>
            <View style={s.balance} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={format('model.openDirectory', { label })}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => {
                if (!disabled) setDirectoryOpen(true)
              }}
              style={({ pressed }) => [s.modelSummary, pressed && s.pressed]}
            >
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
              <View style={s.modelRow}>
                <Text numberOfLines={2} maxFontSizeMultiplier={2} style={s.modelName}>
                  {label}
                </Text>
                <NativeIcon name="chevron-right-outline" size={14} color={theme.colors.inkTertiary} />
              </View>
            </Pressable>
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
          <NativeEffortSlider
            selection={selection}
            choices={choices}
            value={effectiveEffort}
            disabled={!canAdjust}
            onPreview={setPreviewEffort}
            onCommit={(value) => {
              if (canAdjust && value !== effectiveEffort) onSelectEffort?.(value)
            }}
          />
          {status}
        </ScrollView>
      )}
    </NativeAnchoredPanel>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10, gap: 4 },
    header: { flexDirection: 'row', alignItems: 'center' },
    effortTitle: {
      color: theme.colors.accentText,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '500',
      textAlign: 'center',
    },
    modelSummary: {
      flex: 1,
      minWidth: 0,
      minHeight: 64,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: 4,
      borderRadius: theme.radius.control,
    },
    modelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28, maxWidth: '100%' },
    modelName: { color: theme.colors.inkMuted, fontSize: 14, lineHeight: 22, textAlign: 'center', flexShrink: 1 },
    balance: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    icon: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill },
    disabled: { opacity: 0.4 },
    pressed: { backgroundColor: theme.colors.interactiveHover },
    retry: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: theme.radius.control,
      backgroundColor: theme.colors.surfaceMuted,
    },
    retryText: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    notice: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18, paddingVertical: 4 },
    error: { color: theme.colors.danger, fontSize: 12, lineHeight: 18, paddingVertical: 4 },
  })
