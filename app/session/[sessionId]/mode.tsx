import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { NativeSection } from '@/components/native-list'
import { NativeSelectionRow } from '@/components/native-selection'
import { modeOptionDisabled, selectionOptionDisabled } from '@/components/session-route-logic'
import { WorkspaceShell } from '@/components/workspace-shell'
import { useConnectionStore } from '@/state/connection'
import { useRouteSessionSelection } from '@/state/session-selection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { t as message } from '@/locale'

/** Lists the real Agent presets and commits a mode change through the DSH API. */
export default function SessionModeScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { sessionId: rawSessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>()
  const sessionId = firstParam(rawSessionId)
  useRouteSessionSelection(sessionId)
  const connection = useConnectionStore(state => state.connection)
  const client = connection === undefined ? undefined : new MobileApi(connection)
  const presets = useQuery({
    queryKey: ['session-mode-presets', connection?.gatewayUrl, connection?.deviceId],
    enabled: client !== undefined,
    queryFn: () => requireClient(client).agentPresets(),
  })
  const sessions = useQuery({
    queryKey: ['session-mode-session', connection?.gatewayUrl, connection?.deviceId],
    enabled: client !== undefined,
    queryFn: () => requireClient(client).listSessions(),
  })
  const current = sessions.data?.items.find(item => item.sessionId === sessionId)
  const blank = current?.blank === true
  const [submitting, setSubmitting] = useState<string | undefined>(undefined)

  const presetItems = presets.data?.presets ?? []
  return (
    <WorkspaceShell
      leftAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={message('interactions.backToSession')}
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.back}
        >
          <NativeIcon name="arrow-back" color={theme.colors.ink} size={20} />
        </Pressable>
      }
      showMenu={false}
      title={message('mode.selectTitle')}
    >
      <FlatList
        contentContainerStyle={styles.list}
        data={presetItems.length === 0 ? [] : [presetItems]}
        keyExtractor={() => 'mode-presets'}
        ListEmptyComponent={
          <StateView
            loading={presets.isPending}
            error={presets.error}
            onRetry={() => void presets.refetch()}
            text={message('mode.noneAvailable')}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{message('mode.selectTitle')}</Text>
            <Text style={styles.description}>
              {sessions.isError
                ? message('mode.stateUnavailable')
                : sessions.isPending
                  ? message('mode.stateLoading')
                  : blank
                    ? message('mode.blankNote')
                    : message('mode.locked')}
            </Text>
            {sessions.isError ? (
              <>
                <Text style={styles.error}>{mobileErrorMessage(sessions.error, message('conversation.sessionStateFailed'))}</Text>
                <NativeActionButton
                  label={message('conversation.reloadSessionState')}
                  icon="refresh"
                  variant="secondary"
                  onPress={() => void sessions.refetch()}
                />
              </>
            ) : null}
          </View>
        }
        renderItem={({ item: modeItems }) => (
          <NativeSection>
            {modeItems.map((item) => {
              const selected =
                item.id === current?.agentPreset || (current?.agentPreset === undefined && item.isDefault)
              const disabled =
                modeOptionDisabled({
                  sessionsPending: sessions.isPending,
                  sessionsError: sessions.isError,
                  blank,
                  broken: item.broken !== undefined,
                }) || selectionOptionDisabled(submitting !== undefined)
              return (
                <NativeSelectionRow
                  key={item.id}
                  accessibilityLabel={
                    (item.name ?? item.id) + (selected ? message('mode.currentSuffix') : '') + (disabled ? message('common.disabledSuffix') : '')
                  }
                  description={item.broken ?? item.description ?? (item.trust === 'system' ? message('settings.builtinMode') : message('settings.customMode'))}
                  disabled={disabled}
                  loading={submitting === item.id}
                  onPress={() => {
                    if (client === undefined || sessionId === undefined || submitting !== undefined) return
                    setSubmitting(item.id)
                    void client
                      .selectSessionPreset(sessionId, item.id)
                      .then(() => router.back())
                      .catch(error =>
                        Alert.alert(message('mode.switchFailedTitle'), mobileErrorMessage(error, message('mode.switchFailedBody'))),
                      )
                      .finally(() => setSubmitting(undefined))
                  }}
                  preserveDisabledReadability={!blank && !sessions.isPending && !sessions.isError}
                  selected={selected}
                  title={item.name ?? item.id}
                />
              )
            })}
          </NativeSection>
        )}
      />
    </WorkspaceShell>
  )
}

function StateView({
  loading,
  error,
  onRetry,
  text,
}: {
  loading: boolean
  error: unknown
  onRetry: () => void
  text: string
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  if (loading) return <Text style={styles.state}>{message('mode.loading')}</Text>
  if (error !== null && error !== undefined)
    return (
      <View style={styles.stateBlock}>
        <Text style={styles.error}>{mobileErrorMessage(error, message('mode.loadFailed'))}</Text>
        <NativeActionButton label={message('common.reload')} icon="refresh" variant="secondary" onPress={onRetry} />
      </View>
    )
  return <Text style={styles.state}>{text}</Text>
}

function requireClient(client: MobileApi | undefined): MobileApi {
  if (client === undefined) throw new Error(message('drawer.connectFirstBody'))
  return client
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value.find(item => item.trim()) : value
  return candidate?.trim() || undefined
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    back: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
    list: { padding: 16, paddingBottom: 28 },
    header: { gap: 6, marginBottom: 4 },
    title: { color: theme.colors.ink, fontSize: 22, fontWeight: '700' },
    description: { color: theme.colors.inkMuted, lineHeight: 20 },
    state: { color: theme.colors.inkMuted, padding: 18, textAlign: 'center' },
    stateBlock: { alignItems: 'center', gap: 10, padding: 18 },
    error: { color: theme.colors.danger, padding: 18 },
  })
