import { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeIcon } from '@/components/native-icon'
import { agentPresetDescription, agentPresetName, isShippedPreset } from '@/components/session-composer-logic'
import { format, t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { NativeActionButton } from '@/components/native-action-button'
import { presetGuideIntro } from '@/components/settings/settings-labels'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { CenteredState, ErrorState, ReadOnlySetting } from '@/components/settings/settings-shared'
import { makeSettingsStyles } from '@/components/settings/settings-styles'

export function PresetSettings({
  connection,
  selectedPreset,
}: {
  connection: NonNullable<ReturnType<typeof useConnectionStore.getState>['connection']>
  selectedPreset?: string
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeSettingsStyles)
  const [guideOpen, setGuideOpen] = useState(false)
  const client = new MobileApi(connection)
  const presets = useQuery({
    queryKey: queryKeys.agentPresets(connection.gatewayUrl, connection.deviceId),
    queryFn: ({ signal }) => client.withSignal(signal).agentPresets(),
  })
  const detail = useQuery({
    queryKey: queryKeys.agentPreset(connection.gatewayUrl, connection.deviceId, selectedPreset),
    enabled: selectedPreset !== undefined,
    queryFn: ({ signal }) => client.withSignal(signal).agentPreset(selectedPreset ?? ''),
  })
  if (presets.isPending) return <CenteredState text={message('settings.loadingPresets')} />
  if (presets.isError)
    return (
      <ErrorState
        error={presets.error}
        fallback={message('settings.presetsLoadFailed')}
        onRetry={() => void presets.refetch()}
      />
    )
  if (selectedPreset !== undefined) {
    const rosterRow = presets.data?.presets.find((entry) => entry.id === selectedPreset)
    return (
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>
            {rosterRow === undefined ? selectedPreset : agentPresetName(rosterRow)}
          </Text>
          <Text selectable style={styles.presetDetailId}>
            {selectedPreset}
          </Text>
          <Text style={styles.subtitle}>{detail.data?.description ?? message('settings.presetReadOnly')}</Text>
        </View>
        {rosterRow === undefined || !isShippedPreset(rosterRow) ? null : (
          <>
            <NativeActionButton
              icon="code-outline"
              label={message('settings.presetHowToUse')}
              onPress={() => setGuideOpen(true)}
              variant="secondary"
            />
            <NativeAnchoredPanel onClose={() => setGuideOpen(false)} open={guideOpen}>
              <ScrollView contentContainerStyle={styles.presetGuideSheet}>
                <Text style={styles.sectionTitle}>{agentPresetName(rosterRow)}</Text>
                <Text style={styles.presetGuideHeading}>{message('settings.presetExplanation')}</Text>
                <Text style={styles.presetGuideBody}>{agentPresetDescription(rosterRow)}</Text>
                <Text style={styles.presetGuideHeading}>{message('settings.presetHowToUse')}</Text>
                <Text style={styles.presetGuideBody}>{presetGuideIntro(rosterRow) ?? ''}</Text>
              </ScrollView>
            </NativeAnchoredPanel>
          </>
        )}
        {detail.isPending ? (
          <CenteredState text={message('settings.loadingPresetBody')} />
        ) : detail.isError ? (
          <ErrorState
            error={detail.error}
            fallback={message('settings.presetReadFailed')}
            onRetry={() => void detail.refetch()}
          />
        ) : (
          <Text selectable style={styles.code}>
            {detail.data?.content ?? message('settings.presetEmpty')}
          </Text>
        )}
        <ReadOnlySetting
          title={message('settings.editPreset')}
          value={message('settings.desktopOnly')}
          detail={message('settings.editPresetDetail')}
        />
      </ScrollView>
    )
  }
  const allPresets = presets.data?.presets ?? []
  const builtinPresets = allPresets.filter((item) => isShippedPreset(item))
  const customPresets = allPresets.filter((item) => !isShippedPreset(item))
  const groups = [
    ...(builtinPresets.length > 0
      ? [{ key: 'builtin', title: message('settings.presetsBuiltInGroup'), items: builtinPresets }]
      : []),
    ...(customPresets.length > 0
      ? [{ key: 'custom', title: message('settings.customMode'), items: customPresets }]
      : []),
  ]
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={styles.subtitle}>{message('settings.presetsIntro')}</Text>
      {groups.map((group) => (
        <View key={group.key}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.items.map((item) => {
            const open = (): void => {
              router.push({ pathname: '/settings', params: { section: 'presets', preset: item.id } })
            }
            const shipped = isShippedPreset(item)
            return (
              <Pressable
                android_ripple={{ borderless: false }}
                accessibilityLabel={format('settings.viewPreset', { name: agentPresetName(item) })}
                accessibilityRole="button"
                key={item.id}
                onPress={open}
                style={({ pressed }) => [styles.presetRow, pressed && styles.pressed]}
              >
                <View style={styles.presetRowText}>
                  <View style={styles.presetHead}>
                    <Text style={styles.presetName}>{agentPresetName(item)}</Text>
                    {item.isDefault ? (
                      <Text style={styles.presetDefaultTag}>{message('settings.defaultTag')}</Text>
                    ) : shipped ? (
                      <Text style={styles.presetTag}>{message('settings.shippedTag')}</Text>
                    ) : null}
                    <Text numberOfLines={1} style={styles.presetRowId}>
                      {item.id}
                    </Text>
                  </View>
                  <Text numberOfLines={2} style={styles.presetBody}>
                    {agentPresetDescription(item)}
                  </Text>
                </View>
                <NativeIcon name="chevron-right-outline" size={16} color={theme.colors.inkTertiary} />
              </Pressable>
            )
          })}
        </View>
      ))}
      {allPresets.length === 0 ? <Text style={styles.muted}>{message('settings.noPresets')}</Text> : null}
      {!presets.data?.authorable ? (
        <Text style={styles.notice}>{message('settings.customPresetsUnsupported')}</Text>
      ) : null}
    </ScrollView>
  )
}
