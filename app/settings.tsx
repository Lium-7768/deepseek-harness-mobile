import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { NativeListRow, NativeSection } from '@/components/native-list'
import { NativeModelSelectionGroup, type NativeModelSelection, nativeModelSelectionKey } from '@/components/native-model-selection'
import { NativeSelectionRow } from '@/components/native-selection'
import { settingsSectionIcon } from '@/components/settings-logic'
import { WorkspaceShell } from '@/components/workspace-shell'
import { useConnectionStore } from '@/state/connection'
import type { MobileSettingsNamespaceView, MobileSettingsPayload } from '@/types/mobile'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { format, t as message } from '@/locale'

type SettingsSection = 'general' | 'models' | 'plugins' | 'presets'

/** Renders native settings list/detail screens backed by the desktop settings seam. */
export default function SettingsScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { section: rawSection, preset: rawPreset } = useLocalSearchParams<{
    section?: string | string[]
    preset?: string | string[]
  }>()
  const section = parseSection(firstParam(rawSection))
  const preset = firstParam(rawPreset)
  const connection = useConnectionStore(state => state.connection)
  const leftAction =
    section === undefined ? undefined : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={message('settings.backToSettings')}
        hitSlop={8}
        onPress={() => router.back()}
        style={styles.back}
      >
        <NativeIcon name="chevron-left-outline" color={theme.colors.ink} size={20} />
      </Pressable>
    )
  return (
    <WorkspaceShell leftAction={leftAction} showMenu={section === undefined} title={sectionTitle(section)}>
      {connection === undefined ? (
        <ConnectionCard connection={connection} />
      ) : section === undefined ? (
        <SettingsIndex connection={connection} />
      ) : section === 'general' ? (
        <GeneralSettings connection={connection} />
      ) : section === 'models' ? (
        <ModelSettings connection={connection} />
      ) : section === 'plugins' ? (
        <PluginSettings connection={connection} />
      ) : (
        <PresetSettings connection={connection} selectedPreset={preset} />
      )}
    </WorkspaceShell>
  )
}

function SettingsIndex({
  connection,
}: {
  connection: ReturnType<typeof useConnectionStore.getState>['connection']
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>{message('settings.subtitle')}</Text>
      </View>
      <SettingRow title={message('settings.sectionGeneral')} description={message('settings.generalDescription')} section="general" />
      <SettingRow title={message('settings.sectionModels')} description={message('settings.modelsDescription')} section="models" />
      <SettingRow title={message('settings.sectionPlugins')} description={message('settings.pluginsDescription')} section="plugins" />
      <SettingRow title={message('settings.sectionPresets')} description={message('settings.presetsDescription')} section="presets" />
      <ConnectionCard connection={connection} />
    </ScrollView>
  )
}

function SettingRow({
  title,
  description,
  section,
}: {
  title: string
  description: string
  section: SettingsSection
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => router.push({ pathname: '/settings', params: { section } })}
      style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
    >
      <NativeIcon name={settingsSectionIcon(section)} color={theme.colors.accentText} size={21} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <NativeIcon name="chevron-right-outline" color={theme.colors.inkMuted} size={20} />
    </Pressable>
  )
}

function GeneralSettings({
  connection,
}: {
  connection: NonNullable<ReturnType<typeof useConnectionStore.getState>['connection']>
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const client = new MobileApi(connection)
  const queryClient = useQueryClient()
  const settings = useQuery({
    queryKey: ['mobile-settings', connection.gatewayUrl, connection.deviceId],
    queryFn: () => client.settingsDescribe(),
  })
  const presets = useQuery({
    queryKey: ['mobile-agent-presets', connection.gatewayUrl, connection.deviceId],
    queryFn: () => client.agentPresets(),
  })
  const [saving, setSaving] = useState(false)
  const writable = settings.data?.writable === true
  const presetDefault =
    readString(readRecord(namespaceValue(settings.data, 'agent-presets'))?.default) ??
    presets.data?.presets.find(item => item.isDefault)?.id
  const permissionDefault =
    readString(readRecord(namespaceValue(settings.data, 'permission'))?.defaultPreset) ?? 'workspace-write'
  const theme = readString(readRecord(namespaceValue(settings.data, 'ui-theme'))?.preference) ?? 'light'
  const save = (ns: string, patch: Record<string, unknown>, success: string): void => {
    const descriptor = namespace(settings.data, ns)
    setSaving(true)
    void client
      .settingsUpdate({ ns, patch, ...(descriptor === undefined ? {} : { expectedRevision: descriptor.revision }) })
      .then(() => {
        void queryClient.invalidateQueries({
          queryKey: ['mobile-settings', connection.gatewayUrl, connection.deviceId],
        })
        Alert.alert(message('settings.savedTitle'), success)
      })
      .catch(error => Alert.alert(message('settings.saveFailedTitle'), mobileErrorMessage(error, message('settings.saveFailedBody'))))
      .finally(() => setSaving(false))
  }
  if (settings.isPending || presets.isPending) return <CenteredState text={message('settings.loading')} />
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.header}>
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
      <OptionSection title={message('settings.modeSectionTitle')} description={message('settings.modeSectionDescription')}>
        {presets.data?.presets.map(item => (
          <OptionRow
            key={item.id}
            label={item.name ?? item.id}
            description={item.broken ?? item.description ?? message('settings.builtinMode')}
            selected={item.id === presetDefault}
            disabled={!writable || saving || item.broken !== undefined}
            onPress={() => save('agent-presets', { default: item.id }, message('settings.modeAppliesToNewSessions'))}
          />
        ))}
        {presets.data?.presets.length === 0 ? <Text style={styles.muted}>{message('settings.noPresetsConfigured')}</Text> : null}
      </OptionSection>
      <OptionSection title={message('settings.permissionSectionTitle')} description={message('settings.permissionSectionDescription')}>
        <OptionRow
          label={message('settings.permissionReadOnlyLabel')}
          description={message('settings.permissionReadOnlyDetail')}
          selected={permissionDefault === 'read-only'}
          disabled={!writable || saving}
          onPress={() => save('permission', { defaultPreset: 'read-only' }, message('settings.permissionReadOnly'))}
        />
        <OptionRow
          label={message('settings.permissionWorkspaceLabel')}
          description={message('settings.permissionWorkspaceDetail')}
          selected={permissionDefault === 'workspace-write'}
          disabled={!writable || saving}
          onPress={() => save('permission', { defaultPreset: 'workspace-write' }, message('settings.permissionWorkspace'))}
        />
        <OptionRow
          label={message('settings.permissionFullLabel')}
          description={message('settings.permissionFullDetail')}
          selected={permissionDefault === 'danger-full-access'}
          disabled={!writable || saving}
          onPress={() =>
            confirmFullAccess(() =>
              save('permission', { defaultPreset: 'danger-full-access' }, message('settings.permissionFull')),
            )
          }
        />
      </OptionSection>
      <ReadOnlySetting title={message('settings.appearance')} value={themeLabel(theme)} detail={message('settings.appearanceDetail')} />
      <ReadOnlySetting title={message('settings.language')} value={message('settings.languageValue')} detail={message('settings.languageDetail')} />
      <ReadOnlySetting
        title={message('settings.enterBehavior')}
        value={message('settings.enterBehaviorValue')}
        detail={message('settings.enterBehaviorDetail')}
      />
      {!writable ? <Text style={styles.notice}>{message('settings.readOnlyProvider')}</Text> : null}
    </ScrollView>
  )
}

function ModelSettings({
  connection,
}: {
  connection: NonNullable<ReturnType<typeof useConnectionStore.getState>['connection']>
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const client = new MobileApi(connection)
  const queryClient = useQueryClient()
  const models = useQuery({
    queryKey: ['mobile-llm-models', connection.gatewayUrl, connection.deviceId],
    queryFn: () => client.llmModels(),
  })
  const settings = useQuery({
    queryKey: ['mobile-settings', connection.gatewayUrl, connection.deviceId],
    queryFn: () => client.settingsDescribe(),
  })
  const [submitting, setSubmitting] = useState<string | undefined>(undefined)
  const descriptor = namespace(settings.data, 'agent-default-model')
  const selection = readModelSelection(descriptor?.value)
  const writable = settings.data?.writable === true && descriptor !== undefined
  const chooseDefaultModel = (next: NativeModelSelection): void => {
    if (!writable || submitting !== undefined) return
    const key = nativeModelSelectionKey(next.provider, next.model)
    setSubmitting(key)
    void client
      .settingsMutate({
        ns: 'agent-default-model',
        expectedRevision: descriptor.revision,
        ops: [
          { op: 'set', path: ['provider'], value: next.provider },
          { op: 'set', path: ['model'], value: next.model },
          { op: 'unset', path: ['reasoningEffort'] },
        ],
      })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['mobile-settings', connection.gatewayUrl, connection.deviceId] })
        Alert.alert(message('settings.modelSavedTitle'), message('settings.modelAppliesToNewSessions'))
      })
      .catch(error => Alert.alert(message('settings.modelSaveFailedTitle'), mobileErrorMessage(error, message('settings.modelSaveFailedBody'))))
      .finally(() => setSubmitting(undefined))
  }
  if (models.isPending || settings.isPending) return <CenteredState text={message('settings.loadingModels')} />
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>{message('settings.modelScopeNote')}</Text>
      </View>
      {models.isError ? (
        <QueryErrorNotice
          text={mobileErrorMessage(models.error, message('settings.modelsLoadFailed'))}
          onRetry={() => void models.refetch()}
        />
      ) : null}
      {settings.isError ? (
        <QueryErrorNotice
          text={mobileErrorMessage(settings.error, message('settings.defaultModelLoadFailed'))}
          onRetry={() => void settings.refetch()}
        />
      ) : null}
      <Text style={styles.selectionHint}>{message('settings.defaultModel')}</Text>
      {models.data?.groups.map(group => (
        <NativeModelSelectionGroup
          key={group.id}
          disabled={!writable || submitting !== undefined}
          group={group}
          onSelect={chooseDefaultModel}
          selection={selection}
          submittingKey={submitting}
        />
      ))}
      {models.data?.groups.length === 0 ? <Text style={styles.muted}>{message('settings.noModels')}</Text> : null}
      {models.data?.failures.map(failure => (
        <Text key={failure.id} style={styles.warning}>
          {format('settings.modelDirectoryUnavailable', { name: failure.name })}
        </Text>
      ))}
      {!writable ? <Text style={styles.notice}>{message('settings.modelManagedByDesktop')}</Text> : null}
      <ReadOnlySetting
        title={message('settings.providers')}
        value={message('settings.desktopOnly')}
        detail={message('settings.providersDetail')}
      />
    </ScrollView>
  )
}

function PluginSettings({
  connection,
}: {
  connection: NonNullable<ReturnType<typeof useConnectionStore.getState>['connection']>
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const client = new MobileApi(connection)
  const settings = useQuery({
    queryKey: ['mobile-settings', connection.gatewayUrl, connection.deviceId],
    queryFn: () => client.settingsDescribe(),
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
    item =>
      !['ui-onboarding', 'ui-theme', 'locale', 'ui-conversation', 'agent-presets', 'permission'].includes(item.ns),
  )
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {message('settings.pluginsReadOnlyNote')}
        </Text>
      </View>
      <OptionSection title={message('settings.namespacesTitle')} description={message('settings.namespacesDescription')}>
        {namespaces.map(item => (
          <NativeListRow
            key={item.ns}
            description={item.ns}
            multiline
            right={<Text style={styles.muted}>{item.applies === 'restart' ? message('settings.effectRestart') : message('settings.effectLive')}</Text>}
            title={pluginLabel(item.ns)}
          />
        ))}
        {namespaces.length === 0 ? <Text style={styles.muted}>{message('settings.noPlugins')}</Text> : null}
      </OptionSection>
      <ReadOnlySetting title={message('settings.pluginManagement')} value={message('settings.desktopOnly')} detail={message('settings.pluginManagementDetail')} />
    </ScrollView>
  )
}

function PresetSettings({
  connection,
  selectedPreset,
}: {
  connection: NonNullable<ReturnType<typeof useConnectionStore.getState>['connection']>
  selectedPreset?: string
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const client = new MobileApi(connection)
  const presets = useQuery({
    queryKey: ['mobile-agent-presets', connection.gatewayUrl, connection.deviceId],
    queryFn: () => client.agentPresets(),
  })
  const detail = useQuery({
    queryKey: ['mobile-agent-preset', connection.gatewayUrl, connection.deviceId, selectedPreset],
    enabled: selectedPreset !== undefined,
    queryFn: () => client.agentPreset(selectedPreset ?? ''),
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
  if (selectedPreset !== undefined)
    return (
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>{detail.data?.description ?? message('settings.presetReadOnly')}</Text>
        </View>
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
        <ReadOnlySetting title={message('settings.editPreset')} value={message('settings.desktopOnly')} detail={message('settings.editPresetDetail')} />
      </ScrollView>
    )
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {message('settings.presetsIntro')}
        </Text>
      </View>
      {presets.data?.presets.map(item => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={format('settings.viewPreset', { name: item.name ?? item.id })}
          onPress={() => router.push({ pathname: '/settings', params: { section: 'presets', preset: item.id } })}
          style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
        >
          <NativeIcon
            name={item.trust === 'system' ? 'check-outline' : 'deliver-doc'}
            color={theme.colors.accentText}
            size={20}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>
              {item.name ?? item.id}
              {item.isDefault ? message('settings.isDefaultSuffix') : ''}
            </Text>
            <Text style={styles.rowDescription}>
              {item.broken ?? item.description ?? (item.trust === 'system' ? message('settings.builtinMode') : message('settings.customMode'))}
            </Text>
          </View>
          <NativeIcon name="chevron-right-outline" color={theme.colors.inkMuted} size={20} />
        </Pressable>
      ))}
      {presets.data?.presets.length === 0 ? <Text style={styles.muted}>{message('settings.noPresets')}</Text> : null}
      {!presets.data?.authorable ? <Text style={styles.notice}>{message('settings.customPresetsUnsupported')}</Text> : null}
    </ScrollView>
  )
}

function ConnectionCard({
  connection,
}: {
  connection: ReturnType<typeof useConnectionStore.getState>['connection']
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const forgetConnection = useConnectionStore(state => state.forgetConnection)
  const [forgetting, setForgetting] = useState(false)
  const disconnect = (): void => {
    Alert.alert(message('settings.forgetTitle'), message('settings.forgetBody'), [
      { text: message('common.cancel'), style: 'cancel' },
      {
        text: message('settings.forget'),
        style: 'destructive',
        onPress: () => {
          setForgetting(true)
          void forgetConnection()
            .then(() => router.replace('/connect'))
            .catch(error => Alert.alert(message('settings.forgetFailedTitle'), mobileErrorMessage(error, message('settings.forgetFailedBody'))))
            .finally(() => setForgetting(false))
        },
      },
    ])
  }
  return (
    <View style={styles.connectionCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{message('settings.connectionSection')}</Text>
        <View style={styles.connected}>
          <View style={[styles.dot, connection ? styles.dotConnected : styles.dotDisconnected]} />
          <Text style={[styles.connectedText, !connection && styles.disconnectedText]}>
            {connection ? message('settings.connected') : message('settings.disconnected')}
          </Text>
        </View>
      </View>
      <Text style={styles.label}>{message('settings.gateway')}</Text>
      <Text selectable style={styles.value}>
        {connection?.gatewayUrl ?? message('settings.disconnected')}
      </Text>
      <Text style={styles.label}>{message('settings.deviceId')}</Text>
      <Text accessibilityLabel={connection ? format('settings.deviceIdValue', { deviceId: connection.deviceId }) : message('settings.deviceIdNone')} selectable style={styles.value}>
        {connection ? compactDeviceId(connection.deviceId) : message('settings.disconnected')}
      </Text>
      {connection ? (
        <NativeActionButton
          label={message('settings.forgetAction')}
          icon="link-off"
          variant="danger"
          loading={forgetting}
          disabled={forgetting}
          onPress={disconnect}
          style={styles.actionButton}
        />
      ) : (
        <NativeActionButton
          label={message('connect.title')}
          icon="link-outline"
          onPress={() => router.replace('/connect')}
          style={styles.actionButton}
        />
      )}
    </View>
  )
}

function compactDeviceId(deviceId: string): string {
  return deviceId.length <= 14 ? deviceId : `${deviceId.slice(0, 6)}…${deviceId.slice(-6)}`
}

function confirmFullAccess(onConfirm: () => void): void {
  Alert.alert(message('settings.fullAccessTitle'), message('settings.fullAccessBody'), [
    { text: message('common.cancel'), style: 'cancel' },
    { text: message('common.continue'), style: 'destructive', onPress: onConfirm },
  ])
}

function OptionSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <NativeSection title={title}>
      <Text style={styles.sectionDescription}>{description}</Text>
      {children}
    </NativeSection>
  )
}

function OptionRow({
  label,
  description,
  selected,
  disabled,
  onPress,
}: {
  label: string
  description: string
  selected: boolean
  disabled: boolean
  onPress: () => void
}): React.JSX.Element {
  return (
    <NativeSelectionRow
      description={description}
      disabled={disabled}
      onPress={onPress}
      selected={selected}
      title={label}
    />
  )
}

function ReadOnlySetting({
  title,
  value,
  detail,
}: {
  title: string
  value: string
  detail: string
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <NativeListRow
      accessibilityLabel={`${title}：${value}。${detail}`}
      description={detail}
      right={<Text style={styles.muted}>{value}</Text>}
      title={title}
    />
  )
}
function CenteredState({ text }: { text: string }): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.colors.accent} />
      <Text style={styles.muted}>{text}</Text>
    </View>
  )
}

function ErrorState({
  error,
  fallback,
  onRetry,
}: {
  error: unknown
  fallback: string
  onRetry?: () => void
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.center}>
      <Text style={styles.error}>{mobileErrorMessage(error, fallback)}</Text>
      {onRetry ? <NativeActionButton label={message('common.reload')} icon="refresh-outline" variant="secondary" onPress={onRetry} /> : null}
    </View>
  )
}

function QueryErrorNotice({ text, onRetry }: { text: string; onRetry: () => void }): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  return (
    <View accessibilityRole="alert" style={styles.queryError}>
      <NativeIcon name="warning-outline" color={theme.colors.danger} size={17} />
      <View style={styles.queryErrorBody}>
        <Text style={styles.error}>{text}</Text>
        <NativeActionButton label={message('common.reload')} icon="refresh-outline" variant="secondary" onPress={onRetry} />
      </View>
    </View>
  )
}

function namespace(payload: MobileSettingsPayload | undefined, ns: string): MobileSettingsNamespaceView | undefined {
  return payload?.namespaces.find(item => item.ns === ns)
}

function namespaceValue(payload: MobileSettingsPayload | undefined, ns: string): unknown {
  return namespace(payload, ns)?.value
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function readModelSelection(value: unknown): NativeModelSelection | undefined {
  const record = readRecord(value)
  const provider = readString(record?.provider)
  const model = readString(record?.model)
  return provider === undefined || model === undefined ? undefined : { provider, model }
}

function themeLabel(value: string): string {
  if (value === 'dark') return message('settings.themeDark')
  if (value === 'system') return message('settings.themeSystem')
  return message('settings.themeLight')
}

function pluginLabel(ns: string): string {
  const labels: Record<string, string> = {
    'llm-deepseek': message('settings.groupDeepseekModels'),
    'llm-pi-ai': message('settings.groupPiAiModels'),
    'web-search-deepseek': message('settings.groupDeepseekSearch'),
    shell: message('settings.groupTerminal'),
    'agent-loop': message('settings.groupAgentLoop'),
  }
  return labels[ns] ?? ns
}

function parseSection(value: string | undefined): SettingsSection | undefined {
  return value === 'general' || value === 'models' || value === 'plugins' || value === 'presets' ? value : undefined
}

function sectionTitle(section: SettingsSection | undefined): string {
  if (section === 'general') return message('settings.sectionGeneral')
  if (section === 'models') return message('settings.sectionModels')
  if (section === 'plugins') return message('settings.sectionPlugins')
  if (section === 'presets') return message('settings.sectionPresets')
  return message('settings.title')
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value.find(item => item.trim()) : value
  return candidate?.trim() || undefined
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    back: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
    list: { gap: theme.spacing.sm, padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    header: { gap: 4, marginBottom: theme.spacing.xs },
    subtitle: { color: theme.colors.inkMuted, fontSize: 14, lineHeight: 20 },
    settingRow: {
      alignItems: 'center',
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: theme.spacing.md,
      minHeight: theme.touch.minTarget,
      paddingVertical: theme.spacing.sm,
    },
    rowText: { flex: 1, gap: 3 },
    rowTitle: { color: theme.colors.ink, fontSize: 15, fontWeight: '700' },
    rowDescription: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 18 },
    section: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
      padding: 14,
    },
    sectionTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: '500', lineHeight: 24 },
    sectionDescription: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 18, marginBottom: 2 },
    optionRow: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: 9,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
      padding: 11,
    },
    optionSelected: { backgroundColor: theme.colors.surfaceActive, borderColor: '#b9d1ff' },
    optionDisabled: { opacity: 0.5 },
    readOnly: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
      padding: 12,
    },
    selectionHint: {
      color: theme.colors.inkMuted,
      fontSize: theme.typography.caption,
      fontWeight: '600',
      marginHorizontal: theme.spacing.sm,
      marginBottom: -theme.spacing.xs,
    },
    cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    connectionCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.control,
      borderWidth: StyleSheet.hairlineWidth,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    cardTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: '800' },
    connected: { alignItems: 'center', flexDirection: 'row', gap: 5 },
    dot: { borderRadius: 4, height: 7, width: 7 },
    dotConnected: { backgroundColor: theme.colors.success },
    dotDisconnected: { backgroundColor: theme.colors.inkFaint },
    connectedText: { color: theme.colors.successText, fontSize: 11, fontWeight: '800' },
    disconnectedText: { color: theme.colors.inkMuted },
    label: { color: theme.colors.inkMuted, fontSize: 12, fontWeight: '700', marginTop: 7 },
    value: { color: theme.colors.ink, fontSize: 14, lineHeight: 20 },
    actionButton: { marginTop: 10, width: '100%' },
    muted: { color: theme.colors.inkMuted, fontSize: 13 },
    active: { color: theme.colors.successText, fontSize: 12, fontWeight: '700' },
    warning: { color: theme.colors.warningText, fontSize: 12 },
    notice: {
      backgroundColor: theme.colors.warningSoft,
      borderColor: '#efd9a5',
      borderRadius: 9,
      borderWidth: StyleSheet.hairlineWidth,
      color: theme.colors.warningText,
      lineHeight: 19,
      padding: 11,
    },
    code: {
      backgroundColor: theme.colors.codeBackground,
      borderRadius: 10,
      color: theme.colors.codeForeground,
      fontFamily: 'Menlo',
      fontSize: 12,
      lineHeight: 18,
      padding: 12,
    },
    center: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 24 },
    error: { color: theme.colors.danger, lineHeight: 20 },
    queryError: {
      alignItems: 'flex-start',
      backgroundColor: theme.colors.dangerSoft,
      borderColor: '#efb5b0',
      borderRadius: 9,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      padding: 11,
    },
    queryErrorBody: { flex: 1, gap: 8 },
    pressed: { opacity: 0.62 },
  })
