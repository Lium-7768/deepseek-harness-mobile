import { mobileErrorMessage } from '@/api/mobile-api'
import { ConfirmSheet } from '@/components/confirm-sheet'
import { NativeActionButton } from '@/components/native-action-button'
import { format, t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useMobileSyncStore } from '@/state/mobile-sync'
import { useThemedStyles } from '@/theme/hooks'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'

import { makeSettingsStyles } from '@/components/settings/settings-styles'

export function ConnectionSettings({
  connection,
}: {
  connection: ReturnType<typeof useConnectionStore.getState>['connection']
}): React.JSX.Element {
  const styles = useThemedStyles(makeSettingsStyles)
  const forgetConnection = useConnectionStore((state) => state.forgetConnection)
  const status = useMobileSyncStore((state) => state.status)
  const connected = connection !== undefined && status === 'connected'
  const [forgetting, setForgetting] = useState(false)
  const [confirmingForget, setConfirmingForget] = useState(false)
  const disconnect = (): void => {
    setConfirmingForget(true)
  }
  const forget = (): void => {
    setConfirmingForget(false)
    setForgetting(true)
    void forgetConnection()
      .then(() => router.replace('/connect'))
      .catch((error) =>
        Alert.alert(
          message('settings.forgetFailedTitle'),
          mobileErrorMessage(error, message('settings.forgetFailedBody')),
        ),
      )
      .finally(() => setForgetting(false))
  }
  return (
    <>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.connectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{message('settings.connectionSection')}</Text>
            <View style={styles.connected}>
              <View style={[styles.dot, connected ? styles.dotConnected : styles.dotDisconnected]} />
              <Text style={[styles.connectedText, !connected && styles.disconnectedText]}>
                {connected
                  ? message('settings.connected')
                  : status === 'connecting'
                    ? message('conversation.connecting')
                    : message('settings.disconnected')}
              </Text>
            </View>
          </View>
          <View style={styles.connectionField}>
            <Text style={styles.label}>{message('settings.gateway')}</Text>
            <Text numberOfLines={1} selectable style={styles.value}>
              {connection?.gatewayUrl ?? message('settings.disconnected')}
            </Text>
          </View>
          <View style={styles.connectionField}>
            <Text style={styles.label}>{message('settings.deviceId')}</Text>
            <Text
              accessibilityLabel={
                connection
                  ? format('settings.deviceIdValue', { deviceId: connection.deviceId })
                  : message('settings.deviceIdNone')
              }
              numberOfLines={1}
              selectable
              style={styles.value}
            >
              {connection ? compactDeviceId(connection.deviceId) : message('settings.disconnected')}
            </Text>
          </View>
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
      </ScrollView>
      <ConfirmSheet
        open={confirmingForget}
        title={message('settings.forgetTitle')}
        body={message('settings.forgetBody')}
        confirmLabel={message('settings.forget')}
        onCancel={() => setConfirmingForget(false)}
        onConfirm={forget}
      />
    </>
  )
}

function compactDeviceId(deviceId: string): string {
  return deviceId.length <= 14 ? deviceId : `${deviceId.slice(0, 6)}…${deviceId.slice(-6)}`
}
