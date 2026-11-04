import { NativeIcon } from '@/components/native-icon'
import { catalogModelLabel, splitModelId } from '@/components/session-selection-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileModelProviderGroup } from '@/types/mobile'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'

type Choice = { provider: string; model: string }
type Row =
  | { kind: 'group'; key: string; name: string }
  | {
      kind: 'model'
      key: string
      choice: Choice
      label: string
      providerName: string
      detail?: string
      selected: boolean
    }

/** Searchable model drill-down inside the slider's anchored card; routes retain provider identity. */
export function NativeModelDirectory({
  groups,
  selection,
  disabled,
  loading,
  status,
  onBack,
  onSelect,
}: {
  groups: MobileModelProviderGroup[]
  selection?: Choice
  disabled: boolean
  loading: boolean
  status: React.ReactNode
  onBack(): void
  onSelect(choice: Choice): void
}): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const theme = useAppTheme()
  const { fontScale } = useWindowDimensions()
  const [query, setQuery] = useState('')
  const count = groups.reduce((sum, group) => sum + group.models.length, 0)
  const rows = useMemo<Row[]>(() => {
    const needle = query.trim().toLowerCase()
    return groups.flatMap((group) => {
      const models = group.models.filter((model) =>
        [model.name, model.id, model.description ?? '', group.name, group.id].some((value) =>
          value.toLowerCase().includes(needle),
        ),
      )
      if (!models.length) return []
      return [
        { kind: 'group', key: `group:${group.id}`, name: group.name } as Row,
        ...models.map((model) => {
          const choice = { provider: group.id, model: model.id }
          const label = catalogModelLabel(groups, choice)
          const prefix = splitModelId(model.id).prefix
          const detail = model.description?.trim() || prefix
          return {
            kind: 'model' as const,
            key: JSON.stringify([group.id, model.id]),
            choice,
            label,
            providerName: group.name,
            detail: detail && detail !== label ? detail : undefined,
            selected: selection?.provider === group.id && selection.model === model.id,
          }
        }),
      ]
    })
  }, [groups, query, selection?.provider, selection?.model])
  return (
    // Native virtualized rows must remeasure when the system text scale changes.
    <View key={fontScale} style={s.directory}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={message('model.backToEffort')}
          onPress={() => {
            Keyboard.dismiss()
            onBack()
          }}
          style={({ pressed }) => [s.back, pressed && s.pressed]}
        >
          <NativeIcon name="chevron-left-outline" size={16} color={theme.colors.inkMuted} />
        </Pressable>
        <Text style={s.title}>{message('model.selectTitle')}</Text>
        {disabled || loading ? (
          <ActivityIndicator
            accessibilityLabel={message(disabled ? 'composer.switching' : 'common.loading')}
            size="small"
            color={theme.colors.inkMuted}
          />
        ) : null}
      </View>
      {count > 4 || query ? (
        <View style={s.search}>
          <NativeIcon name="search-outline" size={16} color={theme.colors.inkTertiary} />
          <TextInput
            accessibilityLabel={message('model.searchPlaceholder')}
            placeholder={message('model.searchPlaceholder')}
            placeholderTextColor={theme.colors.inkTertiary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            value={query}
            onChangeText={setQuery}
            selectionColor={theme.colors.accent}
            style={s.input}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={message('model.clearSearch')}
              onPress={() => setQuery('')}
              style={s.clear}
            >
              <NativeIcon name="close-outline" size={14} color={theme.colors.inkTertiary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={s.list}
        contentContainerStyle={s.content}
        ListHeaderComponent={<>{status}</>}
        ListEmptyComponent={
          <Text style={s.empty}>
            {message(loading ? 'common.loading' : query.trim() ? 'model.noMatches' : 'model.noAvailableModels')}
          </Text>
        }
        renderItem={({ item }) =>
          item.kind === 'group' ? (
            <Text style={s.group}>{item.name}</Text>
          ) : (
            <Pressable
              accessible
              accessibilityRole="radio"
              accessibilityLabel={format('model.routeLabel', { name: item.label, provider: item.providerName })}
              accessibilityState={{ checked: item.selected, disabled }}
              disabled={disabled}
              onPress={() => {
                if (disabled) return
                Keyboard.dismiss()
                onSelect(item.choice)
              }}
              style={({ pressed }) => [
                s.row,
                item.selected && s.selected,
                disabled && s.disabled,
                pressed && s.pressed,
              ]}
            >
              <View style={s.copy}>
                <Text numberOfLines={2} style={s.name}>
                  {item.label}
                </Text>
                {item.detail ? (
                  <Text numberOfLines={2} style={s.detail}>
                    {item.detail}
                  </Text>
                ) : null}
              </View>
              <View style={s.check}>
                {item.selected ? <NativeIcon name="check-outline" size={18} color={theme.colors.ink} /> : null}
              </View>
            </Pressable>
          )
        }
      />
    </View>
  )
}
const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    directory: { maxHeight: 480, minHeight: 0, flexShrink: 1, padding: 6 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 10 },
    back: {
      width: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.control,
    },
    title: { flex: 1, color: theme.colors.inkTertiary, fontSize: 14, lineHeight: 22, paddingVertical: 8 },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 6,
      marginBottom: 4,
      paddingLeft: 10,
      borderRadius: theme.radius.control,
      backgroundColor: theme.colors.surfaceMuted,
    },
    input: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      paddingVertical: 8,
      color: theme.colors.ink,
      fontSize: 14,
      lineHeight: 22,
    },
    clear: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    list: { minHeight: 0, flexGrow: 0, flexShrink: 1 },
    content: { paddingBottom: 4 },
    group: {
      color: theme.colors.inkTertiary,
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 6,
    },
    row: {
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: theme.radius.md,
    },
    selected: { backgroundColor: theme.colors.interactiveHover },
    pressed: { backgroundColor: theme.colors.interactiveHover },
    disabled: { opacity: 0.4 },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    name: { color: theme.colors.ink, fontSize: 16, lineHeight: 24 },
    detail: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    check: { width: 24, alignItems: 'center' },
    empty: { color: theme.colors.inkTertiary, fontSize: 13, lineHeight: 20, padding: 16, textAlign: 'center' },
  })
