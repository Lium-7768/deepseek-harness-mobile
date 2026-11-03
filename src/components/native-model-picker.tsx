import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeEffortSlider } from '@/components/native-effort-slider'
import { NativeIcon } from '@/components/native-icon'
import { reasoningEffortLabel } from '@/components/model-picker-logic'
import { selectedCatalogModel, splitModelId } from '@/components/session-selection-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileModelCatalogFailure, MobileModelCatalogModel, MobileModelProviderGroup } from '@/types/mobile'
import { useEffect, useMemo, useState, type RefObject } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

export type NativeModelChoice = { provider: string; model: string }
type Row =
  | { key: string; kind: 'header'; title: string }
  | {
      key: string
      kind: 'model'
      current: boolean
      provider: string
      providerName: string
      model: MobileModelCatalogModel
      label: string
      prefix?: string
    }

/** Two-level model control: compact effort card, then a searchable provider-grouped directory. */
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
  const [query, setQuery] = useState('')
  const [modelsOpen, setModelsOpen] = useState(false)
  const [previewEffort, setPreviewEffort] = useState<string>()
  const current = selectedCatalogModel(groups, selection)
  const choices = current?.reasoning?.efforts ?? []
  const effectiveEffort = effort ?? current?.reasoning?.defaultEffort
  const displayEffort = previewEffort ?? effectiveEffort
  const hasEffort = choices.length > 1 && onSelectEffort !== undefined
  const showModels = modelsOpen || !hasEffort
  const label = current
    ? modelName(current)
    : selection
      ? splitModelId(selection.model).leaf
      : message('model.selectTitle')
  const resetEffort = current?.reasoning?.defaultEffort
  const canReset =
    !disabled &&
    resetEffort !== undefined &&
    resetEffort !== effectiveEffort &&
    choices.some((choice) => choice.id === resetEffort)
  useEffect(() => {
    if (!open) {
      setQuery('')
      setModelsOpen(false)
      setPreviewEffort(undefined)
    }
  }, [open])
  useEffect(() => {
    setPreviewEffort(undefined)
  }, [selection?.provider, selection?.model, effort])
  const rows = useMemo<Row[]>(() => {
    const needle = query.trim().toLowerCase()
    return groups.flatMap((group) => {
      const models = group.models.filter((model) =>
        [model.id, model.name, group.id, group.name].some((value) => value.toLowerCase().includes(needle)),
      )
      if (!models.length) return []
      return [
        { key: `group:${group.id}`, kind: 'header', title: group.name } as Row,
        ...models.map((model) => ({
          key: JSON.stringify([group.id, model.id]),
          kind: 'model' as const,
          current: group.id === selection?.provider && model.id === selection?.model,
          provider: group.id,
          providerName: group.name,
          model,
          label: modelName(model),
          prefix: splitModelId(model.id).prefix,
        })),
      ]
    })
  }, [groups, query, selection?.model, selection?.provider])
  if (!open) return null
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
    </>
  )
  return (
    <NativeAnchoredPanel open onClose={onClose} anchorRef={anchorRef}>
      {showModels ? (
        <View style={s.directory}>
          <View style={s.directoryHeader}>
            {hasEffort ? (
              <Pressable
                accessibilityLabel={message('model.backToEffort')}
                accessibilityRole="button"
                onPress={() => {
                  Keyboard.dismiss()
                  setModelsOpen(false)
                  setQuery('')
                }}
                style={s.back}
              >
                <NativeIcon name="chevron-left-outline" size={16} color={theme.colors.inkMuted} />
              </Pressable>
            ) : null}
            <Text style={s.title}>{message('model.selectTitle')}</Text>
            {disabled ? (
              <ActivityIndicator
                accessibilityLabel={message('composer.switching')}
                size="small"
                color={theme.colors.inkMuted}
              />
            ) : null}
          </View>
          {groups.reduce((count, group) => count + group.models.length, 0) > 4 || query ? (
            <View style={s.searchField}>
              <NativeIcon name="search-outline" size={15} color={theme.colors.inkTertiary} />
              <TextInput
                accessibilityLabel={message('model.searchPlaceholder')}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={Keyboard.dismiss}
                selectionColor={theme.colors.accent}
                underlineColorAndroid="transparent"
                onChangeText={setQuery}
                placeholder={message('model.searchPlaceholder')}
                placeholderTextColor={theme.colors.inkTertiary}
                style={s.searchInput}
                value={query}
              />
              {query ? (
                <Pressable
                  accessibilityLabel={message('model.clearSearch')}
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={() => setQuery('')}
                  style={s.back}
                >
                  <NativeIcon name="close-outline" size={14} color={theme.colors.inkTertiary} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <FlatList
            data={rows}
            keyExtractor={(row) => row.key}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={status}
            ListEmptyComponent={
              <Text style={s.empty}>
                {message(
                  loading
                    ? 'common.loading'
                    : failed || routable === false
                      ? 'model.noAvailableModels'
                      : 'model.noMatches',
                )}
              </Text>
            }
            renderItem={({ item }) =>
              item.kind === 'header' ? (
                <Text style={s.groupTitle}>{item.title}</Text>
              ) : (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={
                    item.current
                      ? format('model.currentModelLabel', { name: item.label, provider: item.providerName })
                      : `${item.label}${format('model.modelProviderSuffix', { provider: item.providerName })}`
                  }
                  accessibilityState={{ checked: item.current, disabled }}
                  disabled={disabled}
                  onPress={() => {
                    if (disabled) return
                    onClose()
                    if (!item.current) onSelectModel({ provider: item.provider, model: item.model.id })
                  }}
                  style={({ pressed }) => [
                    s.row,
                    item.current && s.rowSelected,
                    disabled && s.disabled,
                    pressed && s.pressed,
                  ]}
                >
                  <View style={s.modelCopy}>
                    <Text numberOfLines={2} style={s.rowTitle}>
                      {item.label}
                    </Text>
                    {item.prefix ? (
                      <Text numberOfLines={1} style={s.route}>
                        {item.prefix}
                      </Text>
                    ) : null}
                  </View>
                  <View style={s.check}>
                    {item.current ? <NativeIcon name="check-outline" size={18} color={theme.colors.ink} /> : null}
                  </View>
                </Pressable>
              )
            }
            style={s.list}
          />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.effortCard}>
          <View style={s.effortHeader}>
            <View style={s.balance} />
            <View style={s.effortCopy}>
              <Text accessibilityLiveRegion="polite" style={s.effortTitle}>
                {displayEffort ? reasoningEffortLabel(displayEffort, choices) : message('model.providerDefault')}
              </Text>
              <Pressable
                accessibilityLabel={format('composer.selectModel', { label })}
                accessibilityRole="button"
                onPress={() => setModelsOpen(true)}
                style={({ pressed }) => [s.modelLink, pressed && s.pressed]}
              >
                <Text numberOfLines={2} style={s.modelLinkText}>
                  {label}
                </Text>
                <NativeIcon name="chevron-right-outline" size={14} color={theme.colors.inkTertiary} />
              </Pressable>
            </View>
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
                style={[s.reset, !canReset && s.disabled]}
              >
                <NativeIcon name="refresh-outline" size={18} color={theme.colors.inkTertiary} />
              </Pressable>
            ) : (
              <View style={s.balance} />
            )}
          </View>
          <NativeEffortSlider
            key={JSON.stringify(selection)}
            choices={choices}
            value={effectiveEffort}
            disabled={disabled}
            onPreview={setPreviewEffort}
            onCommit={(value) => {
              if (!disabled && value !== effectiveEffort) onSelectEffort?.(value)
            }}
          />
          {status}
        </ScrollView>
      )}
    </NativeAnchoredPanel>
  )
}

function modelName(model: MobileModelCatalogModel): string {
  return model.name !== model.id ? model.name : splitModelId(model.id).leaf
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    directory: { maxHeight: 480, flexShrink: 1, minHeight: 0, padding: 6 },
    directoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, minHeight: 36 },
    title: { color: theme.colors.inkTertiary, fontSize: 14, lineHeight: 22, flex: 1, paddingVertical: 6 },
    back: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 6,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      marginBottom: 4,
    },
    searchInput: { flex: 1, color: theme.colors.ink, fontSize: 14, lineHeight: 22, minHeight: 44, paddingVertical: 8 },
    list: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
    groupTitle: {
      color: theme.colors.inkTertiary,
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 4,
    },
    row: {
      minHeight: 46,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: theme.radius.md,
    },
    rowSelected: { backgroundColor: theme.colors.interactiveHover },
    rowTitle: { color: theme.colors.ink, fontSize: 16, lineHeight: 24 },
    modelCopy: { flex: 1, minWidth: 0, gap: 2 },
    route: { color: theme.colors.inkTertiary, fontSize: 11, lineHeight: 16 },
    check: { width: 24, alignItems: 'center' },
    empty: { color: theme.colors.inkTertiary, fontSize: 13, lineHeight: 20, textAlign: 'center', padding: 16 },
    notice: {
      color: theme.colors.inkTertiary,
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    error: { color: theme.colors.danger, fontSize: 12, lineHeight: 18, paddingHorizontal: 10, paddingVertical: 4 },
    effortCard: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10, gap: 8 },
    effortHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    effortCopy: { flex: 1, alignItems: 'center', minWidth: 0 },
    effortTitle: {
      color: theme.colors.accentText,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '500',
      textAlign: 'center',
    },
    modelLink: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, maxWidth: '100%' },
    modelLinkText: {
      color: theme.colors.inkTertiary,
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
      flexShrink: 1,
    },
    balance: { width: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
    reset: {
      width: 36,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.pill,
    },
    disabled: { opacity: 0.4 },
    pressed: { backgroundColor: theme.colors.interactiveHover },
  })
