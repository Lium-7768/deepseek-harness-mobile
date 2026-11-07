import { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { NativeIcon } from '@/components/native-icon'
import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useQuery } from '@tanstack/react-query'
import { memo, useState } from 'react'
import { FlatList, Text, TextInput, View } from 'react-native'

import { pluginLabel } from '@/components/settings/settings-labels'
import { CenteredState, ErrorState } from '@/components/settings/settings-shared'
import { makeSettingsStyles } from '@/components/settings/settings-styles'

export function PluginSettings({
  connection,
}: {
  connection: NonNullable<ReturnType<typeof useConnectionStore.getState>['connection']>
}): React.JSX.Element {
  const styles = useThemedStyles(makeSettingsStyles)
  const theme = useAppTheme()
  const [query, setQuery] = useState('')
  const client = new MobileApi(connection)
  const settings = useQuery({
    queryKey: queryKeys.settings(connection.gatewayUrl, connection.deviceId),
    queryFn: ({ signal }) => client.withSignal(signal).settingsDescribe(),
  })
  if (settings.isPending) return <CenteredState text={message('settings.loadingPlugins')} />
  if (settings.isError)
    return (
      <ErrorState
        error={settings.error}
        fallback={message('settings.pluginsLoadFailed')}
        onRetry={() => void settings.refetch()}
      />
    )
  const namespaces = settings.data.namespaces.filter(
    (item) =>
      !['ui-onboarding', 'ui-theme', 'locale', 'ui-conversation', 'agent-presets', 'permission'].includes(item.ns),
  )
  const trimmed = query.trim().toLowerCase()
  const visible =
    trimmed.length === 0
      ? namespaces
      : namespaces.filter((item) => `${pluginLabel(item.ns)} ${item.ns}`.toLowerCase().includes(trimmed))
  return (
    <FlatList
      contentContainerStyle={styles.pluginList}
      data={visible}
      keyExtractor={(item) => item.ns}
      ListHeaderComponent={
        <>
          <Text style={styles.pluginIntro}>{message('settings.pluginsReadOnlyNote')}</Text>
          <View style={styles.pluginSearch}>
            <NativeIcon name="search-outline" size={14} color={theme.colors.inkTertiary} />
            <TextInput
              accessibilityLabel={message('settings.searchPlugins')}
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder={message('settings.searchPlugins')}
              placeholderTextColor={theme.colors.inkTertiary}
              style={styles.pluginSearchInput}
              value={query}
            />
          </View>
        </>
      }
      ListEmptyComponent={
        <Text style={styles.muted}>
          {message(namespaces.length === 0 ? 'settings.noPlugins' : 'settings.noPluginMatches')}
        </Text>
      }
      renderItem={({ item }) => <PluginRow item={item} />}
    />
  )
}

const PluginRow = memo(function PluginRow({ item }: { item: { ns: string; applies?: string } }): React.JSX.Element {
  const styles = useThemedStyles(makeSettingsStyles)
  const label = pluginLabel(item.ns)
  return (
    <View style={styles.pluginRow}>
      <View style={styles.pluginRowText}>
        <Text numberOfLines={1} style={styles.pluginRowLabel}>
          {label}
        </Text>
        {label === item.ns ? null : (
          <Text numberOfLines={1} style={styles.pluginRowIdentity}>
            {item.ns}
          </Text>
        )}
      </View>
      <Text style={styles.pluginCardTag}>
        {item.applies === 'restart' ? message('settings.effectRestart') : message('settings.effectLive')}
      </Text>
    </View>
  )
})
