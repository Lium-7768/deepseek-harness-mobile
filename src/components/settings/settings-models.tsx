import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import {
  NativeModelSelectionGroup,
  nativeModelSelectionKey,
  type NativeModelSelection,
} from '@/components/native-model-selection'
import { format, t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useThemedStyles } from '@/theme/hooks'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'

import {
  CenteredState,
  QueryErrorNotice,
  ReadOnlySetting,
  namespace,
  readModelSelection,
} from '@/components/settings/settings-shared'
import { makeSettingsStyles } from '@/components/settings/settings-styles'

export function ModelSettings({
  connection,
}: {
  connection: NonNullable<ReturnType<typeof useConnectionStore.getState>['connection']>
}): React.JSX.Element {
  const styles = useThemedStyles(makeSettingsStyles)
  const client = new MobileApi(connection)
  const queryClient = useQueryClient()
  const models = useQuery({
    queryKey: queryKeys.models(connection.gatewayUrl, connection.deviceId),
    queryFn: ({ signal }) => client.withSignal(signal).llmModels(),
  })
  const settings = useQuery({
    queryKey: queryKeys.settings(connection.gatewayUrl, connection.deviceId),
    queryFn: ({ signal }) => client.withSignal(signal).settingsDescribe(),
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.settings(connection.gatewayUrl, connection.deviceId) })
        Alert.alert(message('settings.modelSavedTitle'), message('settings.modelAppliesToNewSessions'))
      })
      .catch((error) =>
        Alert.alert(
          message('settings.modelSaveFailedTitle'),
          mobileErrorMessage(error, message('settings.modelSaveFailedBody')),
        ),
      )
      .finally(() => setSubmitting(undefined))
  }
  if (models.isPending || settings.isPending) return <CenteredState text={message('settings.loadingModels')} />
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.header}>
        <Text style={styles.panelTitle}>{message('settings.sectionModels')}</Text>
        <Text style={styles.subtitleLarge}>{message('settings.modelScopeNote')}</Text>
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
      {models.data?.groups.map((group) => (
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
      {models.data?.failures.map((failure) => (
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
