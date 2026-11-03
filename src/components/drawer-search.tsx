import { NativeRunningRing } from '@/components/native-running-ring'
import { NativeIcon } from '@/components/native-icon'
import { sanitizeDrawerSearch, type DrawerSearchResult } from '@/components/drawer-view-logic'
import { drawerWidthForViewport, sessionDisplayTitle } from '@/components/session-drawer-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles, useAppTheme } from '@/theme/hooks'
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'

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
  onRestore,
}: {
  result: DrawerSearchResult
  selected: boolean
  onPress(): void
  onRestore(): void
}): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const theme = useAppTheme()
  const title = sessionDisplayTitle(result.session)
  const { width, fontScale } = useWindowDimensions()
  const stacked = drawerWidthForViewport(width) / Math.max(1, fontScale) < 240
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${result.archived ? ` ${message('drawer.archived')}` : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [s.result, selected && s.selected, pressed && s.selected]}
    >
      <View style={s.heading}>
        <View style={s.slot}>{result.session.running && !result.archived ? <NativeRunningRing /> : null}</View>
        <Text numberOfLines={1} style={[s.title, result.archived && s.archived]}>
          {title}
        </Text>
        {result.archived ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={message('drawer.restore')}
            onPress={(event) => {
              event.stopPropagation()
              onRestore()
            }}
            style={s.restore}
          >
            <NativeIcon name="archive-outline" size={14} color={theme.colors.inkTertiary} />
          </Pressable>
        ) : null}
      </View>
      <View style={[s.meta, stacked && s.metaStacked]}>
        <Text
          numberOfLines={1}
          style={[
            s.workspace,
            result.snippet && !stacked ? s.workspaceWithSnippet : undefined,
            result.archived && s.archived,
          ]}
        >
          {result.workspace || message('session.ungrouped')}
        </Text>
        {result.snippet ? (
          <Text numberOfLines={1} style={[s.snippet, stacked && s.snippetStacked, result.archived && s.archived]}>
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
    restore: { width: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
    result: { borderRadius: theme.radius.md, paddingHorizontal: 9, paddingVertical: 8, minHeight: 54, gap: 2 },
    selected: { backgroundColor: theme.colors.interactiveHover },
    heading: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    slot: { width: 16, alignItems: 'center', flexShrink: 0 },
    title: { flex: 1, color: theme.colors.ink, fontSize: 14, lineHeight: 22 },
    meta: { paddingLeft: 20, minWidth: 0, gap: 6, flexDirection: 'row', alignItems: 'center' },
    metaStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 2 },
    workspaceWithSnippet: { maxWidth: '40%' },
    workspace: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 17 },
    snippet: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 17, flex: 1, minWidth: 0 },
    snippetStacked: { flex: 0 },
    archived: { color: theme.colors.inkTertiary },
  })
