import { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { NativeIcon } from '@/components/native-icon'
import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'

import { pluginLabel } from '@/components/settings/settings-labels'
import { CenteredState, ErrorState, ReadOnlySetting } from '@/components/settings/settings-shared'
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
    <ScrollView contentContainerStyle={styles.pluginList}>
      <View style={styles.pluginHeader}>
        <Text style={styles.panelTitleWide}>{message('settings.sectionPlugins')}</Text>
        <Text style={styles.pluginIntro}>{message('settings.pluginsReadOnlyNote')}</Text>
      </View>
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
      <View style={styles.pluginGroup}>
        <Text style={styles.pluginGroupTitle}>{message('settings.namespacesTitle')}</Text>
        <Text style={styles.pluginGroupSub}>{message('settings.namespacesDescription')}</Text>
        <View style={styles.pluginCards}>
          {visible.map((item) => {
            const label = pluginLabel(item.ns)
            return (
              <View key={item.ns} style={styles.pluginCard}>
                <View style={styles.pluginCardHead}>
                  <Text numberOfLines={1} style={styles.pluginCardTitle}>
                    {label}
                  </Text>
                  <Text style={styles.pluginCardTag}>
                    {item.applies === 'restart' ? message('settings.effectRestart') : message('settings.effectLive')}
                  </Text>
                </View>
                {label === item.ns ? null : (
                  <View style={styles.pluginCardMeta}>
                    <Text numberOfLines={1} style={styles.pluginCardIdentity}>
                      {item.ns}
                    </Text>
                  </View>
                )}
              </View>
            )
          })}
          {visible.length === 0 ? (
            <Text style={styles.muted}>
              {message(namespaces.length === 0 ? 'settings.noPlugins' : 'settings.noPluginMatches')}
            </Text>
          ) : null}
        </View>
      </View>
      <ReadOnlySetting
        title={message('settings.pluginManagement')}
        value={message('settings.desktopOnly')}
        detail={message('settings.pluginManagementDetail')}
      />
    </ScrollView>
  )
}
