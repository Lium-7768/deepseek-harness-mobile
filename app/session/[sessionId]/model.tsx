import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { NativeModelSelectionGroup, nativeModelSelectionKey } from '@/components/native-model-selection'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { selectionOptionDisabled, sessionDetailReturnTarget } from '@/components/session-route-logic'
import { WorkspaceShell } from '@/components/workspace-shell'
import { useConnectionStore } from '@/state/connection'
import { useRouteSessionSelection } from '@/state/session-selection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { format, t as message } from '@/locale'

/** Lists the session's real provider catalog and records a model selection. */
export default function SessionModelScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { sessionId: rawSessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>()
  const sessionId = firstParam(rawSessionId)
  useRouteSessionSelection(sessionId)
  const connection = useConnectionStore(state => state.connection)
  const client = connection === undefined ? undefined : new MobileApi(connection)
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)
  const models = useQuery({
    queryKey: ['session-models', connection?.gatewayUrl, connection?.deviceId, sessionId],
    enabled: client !== undefined && sessionId !== undefined,
    queryFn: () => requireClient(client).sessionModels(sessionId ?? ''),
  })
  const current = models.data?.current
  const activeKey = selectedModel ?? (current === undefined ? undefined : `${current.provider}:${current.model}`)
  const [submitting, setSubmitting] = useState<string | undefined>(undefined)

  return (
    <WorkspaceShell
      leftAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={message('interactions.backToSession')}
          hitSlop={8}
          onPress={() => router.replace(sessionDetailReturnTarget(sessionId))}
          style={styles.back}
        >
          <NativeIcon name="chevron-left-outline" color={theme.colors.ink} size={20} />
        </Pressable>
      }
      showMenu={false}
      title={message('model.selectTitle')}
    >
      <FlatList
        contentContainerStyle={styles.list}
        data={models.data?.groups ?? []}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <StateView
            loading={models.isPending}
            error={models.error}
            onRetry={() => void models.refetch()}
            text={message('model.noneAvailable')}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{message('model.selectTitle')}</Text>
            <Text style={styles.description}>{message('model.note')}</Text>
            {models.data?.routable === false ? <Text style={styles.error}>{message('model.routingUnavailable')}</Text> : null}
            {models.data?.failures.map(failure => (
              <Text key={failure.id} style={styles.failure}>
                {format('model.providerUnavailable', { name: failure.name })}
              </Text>
            ))}
          </View>
        }
        renderItem={({ item }) => (
          <NativeModelSelectionGroup
            disabled={selectionOptionDisabled(submitting !== undefined)}
            group={item}
            onSelect={({ provider, model }) => {
              if (client === undefined || sessionId === undefined || submitting !== undefined) return
              const key = nativeModelSelectionKey(provider, model)
              const previous = activeKey
              setSelectedModel(key)
              setSubmitting(key)
              void client
                .selectSessionModel(sessionId, { provider, model })
                .then(() => router.replace(sessionDetailReturnTarget(sessionId)))
                .catch((error) => {
                  setSelectedModel(previous)
                  Alert.alert(message('model.switchFailedTitle'), mobileErrorMessage(error, message('model.switchFailedBody')))
                })
                .finally(() => setSubmitting(undefined))
            }}
            selection={
              activeKey === undefined
                ? undefined
                : { provider: activeKey.slice(0, activeKey.indexOf(':')), model: activeKey.slice(activeKey.indexOf(':') + 1) }
            }
            submittingKey={submitting}
          />
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
  if (loading) return <Text style={styles.state}>{message('model.loading')}</Text>
  if (error !== null && error !== undefined)
    return (
      <View style={styles.stateBlock}>
        <Text style={styles.error}>{mobileErrorMessage(error, message('model.loadFailed'))}</Text>
        <NativeActionButton label={message('common.reload')} icon="refresh-outline" variant="secondary" onPress={onRetry} />
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
    list: { gap: 12, padding: 16, paddingBottom: 28 },
    header: { gap: 6, marginBottom: 4 },
    title: { color: theme.colors.ink, fontSize: 22, fontWeight: '700' },
    description: { color: theme.colors.inkMuted, lineHeight: 20 },
    state: { color: theme.colors.inkMuted, padding: 18, textAlign: 'center' },
    stateBlock: { alignItems: 'center', gap: 10, padding: 18 },
    error: { color: theme.colors.danger, paddingVertical: 4 },
    failure: { color: theme.colors.warning, fontSize: 12 },
  })
