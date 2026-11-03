import { usesStackedFields } from './native-layout'
import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeIcon } from '@/components/native-icon'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { textStyle } from '@/theme/text'
import type { MobileModelCatalogModel, MobileModelProviderGroup } from '@/types/mobile'
import { useEffect, useMemo, useState } from 'react'
import {
  Keyboard,
  useWindowDimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

/** Localizes the catalog's reasoning-depth ids, falling back to the raw id. */
function effortLabel(id: string): string {
  const known: Record<string, string> = {
    high: message('model.effortHigh'),
    low: message('model.effortLow'),
    medium: message('model.effortMedium'),
    off: message('model.effortOff'),
  }
  return known[id.toLowerCase()] ?? id
}

/** The provider/model pair a pick commits. */
export type NativeModelChoice = { provider: string; model: string }

type Row =
  | { key: string; kind: 'header'; title: string }
  | {
      key: string
      kind: 'model'
      /** This row is the session's current model, so it carries the check. */
      current: boolean
      provider: string
      providerName: string
      model: MobileModelCatalogModel
      leaf: string
      prefix: string | undefined
    }

/**
 * Splits a catalog id into the part a row prints and the part it drops.
 *
 * Route-style ids (`cline/nvidia/nemotron-3.5-lighting-free`) bury the readable
 * name at the end and repeat the provider the row already prints, so the leaf
 * becomes the title and the dropped segments move to the row's second line.
 *
 * @param id - Model identifier from the desktop catalog.
 * @returns The last path segment and the prefix in front of it.
 */
export function splitModelId(id: string): { leaf: string; prefix: string | undefined } {
  const segments = id.split('/').filter((segment) => segment.length > 0)
  const leaf = segments.at(-1)
  if (leaf === undefined) return { leaf: id, prefix: undefined }
  const prefix = segments.slice(0, -1).join('/')
  return { leaf, prefix: prefix.length === 0 ? undefined : prefix }
}

function matches(model: MobileModelCatalogModel, providerName: string, query: string): boolean {
  if (query.length === 0) return true
  const needle = query.toLowerCase()
  return (
    model.id.toLowerCase().includes(needle) ||
    model.name.toLowerCase().includes(needle) ||
    providerName.toLowerCase().includes(needle)
  )
}

/**
 * Renders the model and reasoning-effort picker.
 *
 * The catalog this client receives carries every provider the desktop routes to,
 * which is hundreds of rows and buries the effort levels under all of them. The
 * sheet therefore opens on a search field, a provider filter, and one row per
 * model whose title is the readable tail of the route; the selected model's
 * effort levels sit above the list so changing the depth never means scrolling.
 *
 * @param props - Catalog, current route, effort levels, and their commit actions.
 * @returns The picker sheet, or `null` while closed.
 */
export function NativeModelPicker({
  disabled = false,
  effort,
  efforts,
  groups,
  notice,
  onClose,
  onSelectEffort,
  onSelectModel,
  open,
  selection,
}: {
  disabled?: boolean
  effort?: string
  efforts: readonly string[]
  groups: MobileModelProviderGroup[]
  notice?: string
  onClose: () => void
  onSelectEffort?: (effort: string) => void
  onSelectModel: (choice: NativeModelChoice) => void
  open: boolean
  selection?: NativeModelChoice
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const { width, fontScale } = useWindowDimensions()
  const stacked = usesStackedFields(width, fontScale)
  const [query, setQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (!open) {
      setQuery('')
      setProviderFilter(undefined)
    }
  }, [open])

  const rows = useMemo<Row[]>(() => {
    const next: Row[] = []
    const current = groups
      .flatMap((group) => group.models.map((model) => ({ group, model })))
      .find((entry) => entry.group.id === selection?.provider && entry.model.id === selection.model)
    if (
      current !== undefined &&
      query.length === 0 &&
      (providerFilter === undefined || providerFilter === current.group.id)
    ) {
      next.push({ key: 'header-current', kind: 'header', title: message('model.currentSection') })
      next.push(modelRow(current.group, current.model, 'current', selection))
    }
    const visible = groups.filter((group) => providerFilter === undefined || group.id === providerFilter)
    for (const group of visible) {
      const models = group.models.filter((model) => matches(model, group.name, query))
      if (models.length === 0) continue
      const isCurrentGroup = group.id === selection?.provider
      if (query.length === 0 && providerFilter === undefined) {
        next.push({ key: `header-${group.id}`, kind: 'header', title: group.name })
      }
      for (const model of models) {
        // The pinned row already shows the selection while the query is empty; with a
        // query there is no pinned row, so the match keeps its check in place.
        if (isCurrentGroup && model.id === selection?.model && query.length === 0) continue
        next.push(modelRow(group, model, group.id, selection))
      }
    }
    return next
  }, [groups, providerFilter, query, selection?.model, selection?.provider])

  if (!open) return null
  return (
    <NativeAnchoredPanel onClose={onClose} open={open}>
      <View style={s.sheet}>
        <Text style={s.title}>{message('model.selectTitle')}</Text>
        {notice === undefined ? null : <Text style={s.notice}>{notice}</Text>}
        <View style={s.searchField}>
          <NativeIcon name="search-outline" size={14} color={theme.colors.inkMuted} />
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
            placeholderTextColor={theme.colors.inkFaint}
            style={s.searchInput}
            value={query}
          />
          {query.length === 0 ? null : (
            <Pressable
              accessibilityLabel={message('model.clearSearch')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setQuery('')}
              style={s.searchClear}
            >
              <NativeIcon name="close-outline" size={13} color={theme.colors.inkMuted} />
            </Pressable>
          )}
        </View>
        <FlatList
          data={rows}
          ListHeaderComponent={
            query.trim() ? null : (
              <>
                {efforts.length <= 1 ? null : (
                  <View style={s.effortRow}>
                    <Text style={s.effortLabel}>{message('model.reasoningEffort')}</Text>
                    <View style={s.effortChips}>
                      {efforts.map((level) => {
                        const active = level === effort
                        return (
                          <Pressable
                            accessibilityLabel={effortLabel(level)}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: active, disabled }}
                            disabled={disabled}
                            key={level}
                            onPress={() => {
                              onClose()
                              onSelectEffort?.(level)
                            }}
                            style={({ pressed }) => [s.chip, active && s.chipActive, pressed && s.pressed]}
                          >
                            <Text style={[s.chipText, active && s.chipTextActive]}>{effortLabel(level)}</Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                )}
                <View style={s.providerBand}>
                  <ScrollView contentContainerStyle={s.providers} horizontal showsHorizontalScrollIndicator={false}>
                    {[
                      { id: undefined, name: message('model.allProviders') },
                      ...groups.map((group) => ({ id: group.id, name: group.name })),
                    ].map((entry) => {
                      const active = entry.id === providerFilter
                      return (
                        <Pressable
                          accessibilityLabel={entry.name}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                          key={entry.id ?? 'all'}
                          onPress={() => setProviderFilter(entry.id)}
                          style={({ pressed }) => [s.providerChip, active && s.chipActive, pressed && s.pressed]}
                        >
                          <Text numberOfLines={1} style={[s.chipText, active && s.chipTextActive]}>
                            {entry.name}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                </View>
              </>
            )
          }
          keyboardShouldPersistTaps="handled"
          keyExtractor={(row) => row.key}
          ListEmptyComponent={<Text style={s.empty}>{message('model.noMatches')}</Text>}
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <Text style={s.groupTitle}>{item.title}</Text>
            ) : (
              <Pressable
                accessibilityLabel={
                  item.current
                    ? format('model.currentModelLabel', { name: item.leaf, provider: item.providerName })
                    : `${item.model.name}${format('model.modelProviderSuffix', { provider: item.providerName })}`
                }
                accessibilityRole="radio"
                accessibilityState={{ checked: item.current, disabled }}
                disabled={disabled}
                onPress={() => {
                  onClose()
                  onSelectModel({ model: item.model.id, provider: item.provider })
                }}
                style={({ pressed }) => [
                  s.row,
                  item.current && s.rowSelected,
                  disabled && s.rowDisabled,
                  pressed && s.pressed,
                ]}
              >
                <View style={[s.modelCopy, stacked && s.modelCopyStacked]}>
                  <Text numberOfLines={stacked ? 2 : 1} style={[s.rowTitle, item.current && s.rowTitleSelected]}>
                    {item.leaf}
                  </Text>
                  <Text numberOfLines={1} style={[s.rowProvider, stacked && s.rowProviderStacked]}>
                    {item.prefix === undefined ? item.providerName : `${item.providerName} · ${item.prefix}`}
                  </Text>
                </View>
                {item.current ? <NativeIcon name="check-outline" size={16} color={theme.colors.accentText} /> : null}
              </Pressable>
            )
          }
          style={s.list}
        />
      </View>
    </NativeAnchoredPanel>
  )
}

function modelRow(
  group: MobileModelProviderGroup,
  model: MobileModelCatalogModel,
  scope: string,
  selection?: NativeModelChoice,
): Row {
  const { leaf, prefix } = splitModelId(model.id)
  return {
    key: `${scope}:${group.id}:${model.id}`,
    kind: 'model',
    current: group.id === selection?.provider && model.id === selection.model,
    model,
    prefix,
    provider: group.id,
    providerName: group.name,
    leaf: model.name === model.id ? leaf : model.name,
  }
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheet: {
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: theme.radius.md,
      gap: 8,
      maxHeight: 520,
      flexShrink: 1,
      minHeight: 0,
      paddingHorizontal: 6,
      paddingVertical: 10,
    },
    title: { color: theme.colors.ink, fontSize: 14, fontWeight: '500', lineHeight: 22, paddingHorizontal: 8 },
    notice: { ...textStyle(theme, 'caption', 'tertiary'), paddingHorizontal: 8 },
    searchField: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      gap: 6,
      marginHorizontal: 8,
      paddingHorizontal: 10,
    },
    searchInput: { color: theme.colors.ink, flex: 1, fontSize: 14, minHeight: 44, paddingVertical: 8 },
    searchClear: { alignItems: 'center', height: 24, justifyContent: 'center', width: 24 },
    effortRow: {
      flexWrap: 'wrap',
      paddingVertical: 4,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 8,
    },
    effortLabel: { ...textStyle(theme, 'label', 'tertiary') },
    effortChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    providerBand: { flexGrow: 0, paddingVertical: 4 },
    providers: { alignItems: 'center', gap: 6, paddingHorizontal: 8 },
    providerChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      maxWidth: 168,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minHeight: 36,
      justifyContent: 'center',
    },
    chip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minHeight: 36,
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: theme.colors.interactiveHover },
    chipText: { ...textStyle(theme, 'caption', 'secondary') },
    chipTextActive: { color: theme.colors.ink },
    list: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
    groupTitle: { ...textStyle(theme, 'label', 'tertiary'), paddingHorizontal: 8, paddingTop: 6, paddingBottom: 2 },
    row: {
      alignItems: 'center',
      borderRadius: theme.radius.sm,
      flexDirection: 'row',
      gap: 8,
      minHeight: 44,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    // The current model reads as chosen at a glance: an accent-soft fill the whole
    // row carries, with the accent check at the trailing edge.
    rowSelected: { backgroundColor: theme.colors.accentSoft },
    rowDisabled: { opacity: 0.4 },
    modelCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
    modelCopyStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 2 },
    rowProviderStacked: { textAlign: 'left' },
    rowTitle: { ...textStyle(theme, 'paragraph'), flexShrink: 1, minWidth: 0 },
    rowTitleSelected: { color: theme.colors.accentText, fontWeight: '500' },
    // The provider trails the name on the same line and yields width first, so a
    // long route keeps the model name readable and truncates the provenance.
    rowProvider: { ...textStyle(theme, 'label', 'tertiary'), flexShrink: 1, minWidth: 0, textAlign: 'right' },
    empty: {
      ...textStyle(theme, 'caption', 'tertiary'),
      paddingHorizontal: 8,
      paddingVertical: 16,
      textAlign: 'center',
    },
    pressed: { opacity: 0.62 },
  })
