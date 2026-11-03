import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { NativeIcon } from '@/components/native-icon'
import { agentPresetDescription, agentPresetName } from '@/components/session-composer-logic'
import { format, t as message } from '@/locale'
import { useAppearanceStore } from '@/state/appearance'
import { useConnectionStore } from '@/state/connection'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Constants from 'expo-constants'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'

import { confirmFullAccess } from '@/components/settings/settings-connection'
import {
  APPEARANCES,
  CenteredState,
  ChoiceSheet,
  PERMISSION_CHOICES,
  QueryErrorNotice,
  ReadOnlySetting,
  SettingsFieldRow,
  namespace,
  namespaceValue,
  permissionLabel,
  readRecord,
  readString,
  themeLabel,
  type SettingsPicker,
} from '@/components/settings/settings-shared'
import { makeSettingsStyles } from '@/components/settings/settings-styles'

export function GeneralSettings({
  connection,
}: {
  connection: NonNullable<ReturnType<typeof useConnectionStore.getState>['connection']>
}): React.JSX.Element {
  const palette = useAppTheme()
  const styles = useThemedStyles(makeSettingsStyles)
  const client = new MobileApi(connection)
  const queryClient = useQueryClient()
  const settings = useQuery({
    queryKey: queryKeys.settings(connection.gatewayUrl, connection.deviceId),
    queryFn: ({ signal }) => client.withSignal(signal).settingsDescribe(),
  })
  const presets = useQuery({
    queryKey: queryKeys.agentPresets(connection.gatewayUrl, connection.deviceId),
    queryFn: ({ signal }) => client.withSignal(signal).agentPresets(),
  })
  const [saving, setSaving] = useState(false)
  const [picker, setPicker] = useState<SettingsPicker | undefined>(undefined)
  const setAppearancePreference = useAppearanceStore((state) => state.setPreference)
  const writable = settings.data?.writable === true
  const presetDefault =
    readString(readRecord(namespaceValue(settings.data, 'agent-presets'))?.default) ??
    presets.data?.presets.find((item) => item.isDefault)?.id
  const permissionDefault =
    readString(readRecord(namespaceValue(settings.data, 'permission'))?.defaultPreset) ?? 'workspace-write'
  // The phone renders its own stored preference: the desktop value describes the
  // desktop window, and the two clients can legitimately differ.
  const appearance = useAppearanceStore((state) => state.preference)
  // The desktop prints its own release in General; the phone prints the version the
  // manifest embedded, so a support report names the build the reader is holding.
  const appVersion = Constants.expoConfig?.version
  const save = (ns: string, patch: Record<string, unknown>, success: string): void => {
    const descriptor = namespace(settings.data, ns)
    setSaving(true)
    void client
      .settingsUpdate({ ns, patch, ...(descriptor === undefined ? {} : { expectedRevision: descriptor.revision }) })
      .then(() => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.settings(connection.gatewayUrl, connection.deviceId),
        })
        Alert.alert(message('settings.savedTitle'), success)
      })
      .catch((error) =>
        Alert.alert(message('settings.saveFailedTitle'), mobileErrorMessage(error, message('settings.saveFailedBody'))),
      )
      .finally(() => setSaving(false))
  }
  const chooseMode = (preset: string): void => {
    setPicker(undefined)
    save('agent-presets', { default: preset }, message('settings.modeAppliesToNewSessions'))
  }
  const choosePermission = (permission: string): void => {
    setPicker(undefined)
    if (permission === 'danger-full-access') {
      confirmFullAccess(() => save('permission', { defaultPreset: permission }, message('settings.permissionFull')))
      return
    }
    save('permission', { defaultPreset: permission }, message('settings.permissionWorkspace'))
  }
  if (settings.isPending || presets.isPending) return <CenteredState text={message('settings.loading')} />
  const modeLabel =
    presets.data?.presets.find((item) => item.id === presetDefault) === undefined
      ? presetDefault
      : agentPresetName(presets.data.presets.find((item) => item.id === presetDefault)!)
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.header}>
        <Text style={styles.panelTitle}>{message('settings.sectionGeneral')}</Text>
        <Text style={styles.subtitle}>{message('settings.mobileScopeNote')}</Text>
      </View>
      {settings.isError ? (
        <QueryErrorNotice
          text={mobileErrorMessage(settings.error, message('settings.loadFailed'))}
          onRetry={() => void settings.refetch()}
        />
      ) : null}
      {presets.isError ? (
        <QueryErrorNotice
          text={mobileErrorMessage(presets.error, message('settings.presetsLoadFailed'))}
          onRetry={() => void presets.refetch()}
        />
      ) : null}
      <SettingsFieldRow
        label={message('settings.modeSectionTitle')}
        description={message('settings.modeSectionDescription')}
        disabled={!writable || saving}
        value={modeLabel ?? message('settings.noPresetsConfigured')}
        onPress={() =>
          setPicker({
            title: message('settings.modeSectionTitle'),
            value: presetDefault,
            options: (presets.data?.presets ?? []).map((item) => ({
              value: item.id,
              label: agentPresetName(item),
              description: agentPresetDescription(item),
              disabled: item.broken !== undefined,
            })),
            onSelect: chooseMode,
          })
        }
      />
      <SettingsFieldRow
        label={message('settings.permissionSectionTitle')}
        description={message('settings.permissionSectionDescription')}
        disabled={!writable || saving}
        value={permissionLabel(permissionDefault)}
        onPress={() =>
          setPicker({
            title: message('settings.permissionSectionTitle'),
            value: permissionDefault,
            options: PERMISSION_CHOICES.map((choice) => ({ value: choice, label: permissionLabel(choice) })),
            onSelect: choosePermission,
          })
        }
      />
      <SettingsFieldRow
        label={message('settings.language')}
        description={message('settings.languageDetail')}
        disabled
        value={message('settings.languageValue')}
      />
      <SettingsFieldRow
        label={message('settings.appearance')}
        description={message('settings.appearanceDetail')}
        value={themeLabel(appearance)}
      />
      <View style={styles.appearanceCards}>
        {APPEARANCES.map((item) => {
          const selected = appearance === item.id
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: saving || selected }}
              disabled={saving || selected}
              key={item.id}
              onPress={() => {
                void setAppearancePreference(item.id)
                // Recorded on the desktop too, so its settings page agrees with
                // the phone rather than keeping a stale theme preference.
                if (writable) save('ui-theme', { preference: item.id }, message('settings.appearanceSaved'))
              }}
              style={({ pressed }) => [
                styles.appearanceCard,
                selected && styles.appearanceCardSelected,
                saving && styles.appearanceCardDisabled,
                pressed && styles.pressed,
              ]}
            >
              <NativeIcon
                name={item.icon}
                color={selected ? palette.colors.ink : palette.colors.inkTertiary}
                size={20}
              />
              <Text style={styles.appearanceLabel}>{message(item.label)}</Text>
            </Pressable>
          )
        })}
      </View>
      <ReadOnlySetting
        title={message('settings.enterBehavior')}
        value={message('settings.enterBehaviorValue')}
        detail={message('settings.enterBehaviorDetail')}
      />
      {appVersion === undefined ? null : (
        <Text style={styles.versionRow}>{format('settings.currentVersion', { version: appVersion })}</Text>
      )}
      {!writable ? <Text style={styles.notice}>{message('settings.readOnlyProvider')}</Text> : null}
      <ChoiceSheet picker={picker} onClose={() => setPicker(undefined)} />
    </ScrollView>
  )
}
