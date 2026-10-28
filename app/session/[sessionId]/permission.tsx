import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { NativeListRow, NativeSection } from '@/components/native-list'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { permissionDescription, permissionLabel, readPermissionSelect } from '@/components/session-composer-logic'
import { permissionOptionsLocked } from '@/components/session-route-logic'
import { WorkspaceShell } from '@/components/workspace-shell'
import { useConnectionStore } from '@/state/connection'
import { useRouteSessionSelection } from '@/state/session-selection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { format, t as message } from '@/locale'

/** Lists the host-projected permission presets and submits the existing command path. */
export default function SessionPermissionScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { sessionId: rawSessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>()
  const sessionId = firstParam(rawSessionId)
  useRouteSessionSelection(sessionId)
  const connection = useConnectionStore(state => state.connection)
  const client = connection === undefined ? undefined : new MobileApi(connection)
  const queryClient = useQueryClient()
  const [submitting, setSubmitting] = useState<string | undefined>(undefined)
  const history = useQuery({
    queryKey: ['session-history', sessionId],
    enabled: client !== undefined && sessionId !== undefined,
    queryFn: () => requireClient(client).sessionHistory(sessionId ?? ''),
  })
  const events = useQuery({
    queryKey: ['session-events', sessionId],
    enabled: client !== undefined && sessionId !== undefined,
    queryFn: () => requireClient(client).sessionEvents(sessionId ?? '', 0),
    staleTime: Infinity,
  })
  const permissions = readPermissionSelect(history.data?.projections?.values.permissions)
  const locked = permissionOptionsLocked({
    eventsError: events.isError,
    eventsPending: events.isPending,
    eventsStale: events.isStale,
    status: events.data?.status,
    submitting: submitting !== undefined,
  })

  const options = permissions?.options.filter(item => item.value !== 'custom') ?? []
  const choose = (value: string): void => {
    if (client === undefined || sessionId === undefined || locked || value === permissions?.currentValue) return
    if (value === 'danger-full-access') {
      Alert.alert(message('settings.fullAccessTitle'), message('permission.fullAccessBody'), [
        { text: message('common.cancel'), style: 'cancel' },
        { text: message('common.continue'), style: 'destructive', onPress: () => submit(value) },
      ])
      return
    }
    submit(value)
  }

  const submit = (value: string): void => {
    if (client === undefined || sessionId === undefined || locked) return
    setSubmitting(value)
    void client
      .sendMessage(sessionId, [{ type: 'text', text: `/permission ${value}` }])
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['session-history', sessionId] })
        void queryClient.invalidateQueries({ queryKey: ['session-events', sessionId] })
        router.back()
      })
      .catch(error => Alert.alert(message('permission.switchFailedTitle'), mobileErrorMessage(error, message('permission.switchFailedBody'))))
      .finally(() => setSubmitting(undefined))
  }

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
          <NativeIcon name="chevron-left-outline" color={theme.colors.ink} size={20} />
        </Pressable>
      }
      showMenu={false}
      title={message('permission.selectTitle')}
    >
      <FlatList
        contentContainerStyle={styles.list}
        data={options.length === 0 ? [] : [options]}
        keyExtractor={() => 'permission-options'}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{message('permission.selectTitle')}</Text>
            <Text style={styles.description}>
              {events.isError
                ? message('permission.stateUnavailable')
                : permissions === undefined
                  ? message('permission.noProjection')
                  : locked
                    ? message('permission.lockedWhileRunning')
                    : message('permission.writeNote')}
            </Text>
            {events.isError ? (
              <>
                <Text style={styles.error}>{mobileErrorMessage(events.error, message('conversation.sessionStateFailed'))}</Text>
                <NativeActionButton
                  label={message('conversation.reloadSessionState')}
                  icon="refresh-outline"
                  variant="secondary"
                  onPress={() => void events.refetch()}
                />
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          history.isPending ? (
            <Text style={styles.state}>{message('permission.loading')}</Text>
          ) : history.isError ? (
            <View>
              <Text style={styles.error}>{mobileErrorMessage(history.error, message('permission.loadFailed'))}</Text>
              <NativeActionButton
                label={message('permission.reload')}
                icon="refresh-outline"
                variant="secondary"
                onPress={() => void history.refetch()}
              />
            </View>
          ) : events.isError ? (
            <Text style={styles.error}>{message('permission.stateFailedLocked')}</Text>
          ) : (
            <Text style={styles.state}>{message('permission.noPresets')}</Text>
          )
        }
        renderItem={({ item: optionItems }) => (
          <NativeSection>
            {optionItems.map((item) => {
              const selected = item.value === permissions?.currentValue
              const disabled = locked || item.value === 'custom'
              return (
                <NativeListRow
                  key={item.value}
                  accessibilityLabel={
                    permissionLabel(item.value, item.name) +
                    (selected ? message('permission.currentSuffix') : '') +
                    (disabled ? message('common.disabledSuffix') : '')
                  }
                  accessibilityRole="radio"
                  description={item.description ?? permissionDescription(item.value)}
                  disabled={disabled}
                  multiline
                  left={
                    <NativeIcon
                      name="shield-outline"
                      size={20}
                      color={selected ? theme.colors.accentText : theme.colors.inkMuted}
                    />
                  }
                  onPress={() => choose(item.value)}
                  right={selected ? <NativeIcon name="check-outline" color={theme.colors.accentText} size={20} /> : null}
                  selected={selected}
                  title={permissionLabel(item.value, item.name)}
                />
              )
            })}
          </NativeSection>
        )}
      />
    </WorkspaceShell>
  )
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
    error: { color: theme.colors.danger, padding: 18 },
  })
