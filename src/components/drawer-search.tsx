import { NativeIcon } from '@/components/native-icon'
import { sanitizeDrawerSearch, type DrawerSearchResult } from '@/components/drawer-view-logic'
import { sessionDisplayTitle } from '@/components/session-drawer-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles, useAppTheme } from '@/theme/hooks'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

/** Expanded desktop search occupies the section header instead of adding a separate row. */
export function DrawerSearchInput({
  value,
  onChange,
  onClose,
}: {
  value: string
  onChange(value: string): void
  onClose(): void
}): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const theme = useAppTheme()
  return (
    <View style={s.search}>
      <View style={s.searchGlyph}>
        <NativeIcon name="search-outline" size={12} color={theme.colors.inkTertiary} />
      </View>
      <TextInput
        autoFocus
        accessibilityLabel={message('drawer.searchSessions')}
        placeholder={message('drawer.searchPlaceholder')}
        placeholderTextColor={theme.colors.inkTertiary}
        selectionColor={theme.colors.accent}
        value={value}
        onChangeText={(text) => onChange(sanitizeDrawerSearch(text))}
        onKeyPress={(event) => {
          if (event.nativeEvent.key === 'Escape') onClose()
        }}
        onBlur={() => {
          if (value.trim() === '') onClose()
        }}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={s.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={message('drawer.clearSearch')}
        onPress={onClose}
        style={s.close}
      >
        <NativeIcon name="close-fill" size={14} color={theme.colors.inkTertiary} />
      </Pressable>
    </View>
  )
}

/** Title + workspace + content snippet, matching the desktop SearchResultItem hierarchy. */
export function DrawerSearchRow({
  result,
  selected,
  onPress,
}: {
  result: DrawerSearchResult
  selected: boolean
  onPress(): void
}): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const theme = useAppTheme()
  const title = sessionDisplayTitle(result.session)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${result.archived ? ` ${message('drawer.archived')}` : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [s.result, selected && s.selected, pressed && s.selected]}
    >
      <View style={s.heading}>
        <View style={s.slot}>{result.session.running && !result.archived ? <View style={s.ring} /> : null}</View>
        <Text numberOfLines={1} style={[s.title, result.archived && s.archived]}>
          {title}
        </Text>
        {result.archived ? <NativeIcon name="archive-outline" size={14} color={theme.colors.inkTertiary} /> : null}
      </View>
      <View style={s.meta}>
        <Text numberOfLines={1} style={[s.workspace, result.archived && s.archived]}>
          {result.workspace || message('session.ungrouped')}
        </Text>
        {result.snippet ? (
          <Text numberOfLines={1} style={[s.snippet, result.archived && s.archived]}>
            {result.snippet}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    search: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.md,
      minHeight: 36,
      marginHorizontal: 4,
    },
    searchGlyph: { width: 28, alignItems: 'center' },
    input: {
      color: theme.colors.ink,
      flex: 1,
      minWidth: 0,
      minHeight: 36,
      fontSize: 13,
      lineHeight: 18,
      padding: 0,
      paddingVertical: 4,
    },
    close: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
    result: { borderRadius: theme.radius.md, paddingHorizontal: 9, paddingVertical: 8, minHeight: 54, gap: 2 },
    selected: { backgroundColor: theme.colors.interactiveHover },
    heading: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    slot: { width: 16, alignItems: 'center', flexShrink: 0 },
    ring: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: theme.colors.inkTertiary },
    title: { flex: 1, color: theme.colors.ink, fontSize: 14, lineHeight: 22 },
    meta: { paddingLeft: 20, minWidth: 0, gap: 2 },
    workspace: { color: theme.colors.inkTertiary, fontSize: 11, lineHeight: 16 },
    snippet: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18 },
    archived: { color: theme.colors.inkTertiary },
  })
