import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { nativeModelSelectionKey, type NativeModelSelection } from '@/components/native-model-selection'
import { ModelChoiceSheet } from '@/components/settings/model-choice-sheet'
import { catalogModelLabel } from '@/components/session-selection-logic'
import { format, t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useThemedStyles } from '@/theme/hooks'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, ScrollView, Text } from 'react-native'

import {
  CenteredState,
  QueryErrorNotice,
  SettingsFieldRow,
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
  const [pickerOpen, setPickerOpen] = useState(false)
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
  const groups = models.data?.groups ?? []
  return (
    <ScrollView contentContainerStyle={styles.list}>
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
      <SettingsFieldRow
        description={message('settings.modelScopeNote')}
        disabled={!writable || models.isError}
        label={message('settings.defaultModel')}
        onPress={
          writable
            ? () => {
                setPickerOpen(true)
              }
            : undefined
        }
        value={selection === undefined ? message('settings.noModels') : catalogModelLabel(groups, selection)}
      />
      {groups.length === 0 && !models.isError ? <Text style={styles.muted}>{message('settings.noModels')}</Text> : null}
      {models.data?.failures.map((failure) => (
        <Text key={failure.id} style={styles.warning}>
          {format('settings.modelDirectoryUnavailable', { name: failure.name })}
        </Text>
      ))}
      {!writable ? <Text style={styles.notice}>{message('settings.modelManagedByDesktop')}</Text> : null}
      <ModelChoiceSheet
        groups={groups}
        loading={models.isFetching}
        onClose={() => setPickerOpen(false)}
        onSelect={chooseDefaultModel}
        open={pickerOpen}
        selection={selection}
        submitting={submitting}
      />
    </ScrollView>
  )
}
