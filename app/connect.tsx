import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { mobileErrorMessage } from '@/api/mobile-api'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'

export default function ConnectScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const [gatewayUrl, setGatewayUrl] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const setConnection = useConnectionStore(state => state.setConnection)
  const connect = async (): Promise<void> => {
    setError('')
    try {
      if (gatewayUrl.trim() === '') throw new Error('请输入移动网关地址。')
      let parsed: URL
      try {
        parsed = new URL(gatewayUrl.trim())
      } catch {
        throw new Error('请输入有效的网关地址。')
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('请输入 HTTP 或 HTTPS 网关地址。')
      if (deviceId.trim() === '' || accessToken.trim() === '') throw new Error('请输入桌面端批准的设备 ID 和访问令牌。')
      setSaving(true)
      await setConnection({
        gatewayUrl: parsed.toString().replace(/\/$/, ''),
        deviceId: deviceId.trim(),
        accessToken: accessToken.trim(),
      })
      router.replace('/workspace')
    } catch (value) {
      setError(mobileErrorMessage(value, '连接桌面端失败，请检查网关地址和设备凭据。'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <WorkspaceShell title="连接桌面端" showMenu={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? workspaceKeyboardVerticalOffset(insets.top, false) : 0}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>DEEPSEEK HARNESS</Text>
            <Text style={styles.title}>连接桌面端</Text>
            <Text style={styles.copy}>扫描桌面端生成的一次性配对二维码即可安全连接。</Text>
          </View>
          <View style={styles.form}>
            <NativeActionButton
              label="扫描配对二维码"
              icon="link"
              onPress={() => router.push('/connect/scan')}
              style={styles.connectButton}
            />
            <Text style={styles.manualLabel}>无法扫码时，可手动输入桌面端批准的连接信息。</Text>
            <Field
              label="移动网关地址"
              value={gatewayUrl}
              onChangeText={setGatewayUrl}
              placeholder="http://192.168.1.4:52404"
              keyboardType="url"
            />
            <Field label="设备 ID" value={deviceId} onChangeText={setDeviceId} placeholder="已配对的设备 ID" />
            <Field
              label="访问令牌"
              value={accessToken}
              onChangeText={setAccessToken}
              placeholder="设备访问令牌"
              secureTextEntry
            />
            {error !== '' ? (
              <View accessibilityRole="alert" style={styles.error}>
                <NativeIcon name="error-outline" color={theme.colors.danger} size={18} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <NativeActionButton
              label="连接"
              icon="link"
              loading={saving}
              onPress={() => void connect()}
              style={styles.connectButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </WorkspaceShell>
  )
}

function Field(props: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  secureTextEntry?: boolean
  keyboardType?: 'url'
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        accessibilityLabel={props.label}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={props.keyboardType}
        placeholder={props.placeholder}
        placeholderTextColor={theme.colors.inkFaint}
        secureTextEntry={props.secureTextEntry}
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
      />
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xl },
    hero: { gap: theme.spacing.xs, marginBottom: theme.spacing.lg },
    eyebrow: {
      color: theme.colors.accentText,
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1.3,
    },
    title: { color: theme.colors.ink, fontSize: 28, fontWeight: '800' },
    copy: { color: theme.colors.inkMuted, fontSize: theme.typography.bodyLarge, lineHeight: 23 },
    form: { gap: theme.spacing.md },
    manualLabel: { color: theme.colors.inkMuted, fontSize: theme.typography.caption, lineHeight: 18 },
    field: { gap: theme.spacing.xs },
    label: { color: theme.colors.inkMuted, fontSize: theme.typography.caption, fontWeight: '700' },
    input: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.control,
      borderWidth: 1,
      color: theme.colors.ink,
      fontSize: theme.typography.bodyLarge,
      minHeight: theme.touch.minTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    connectButton: { marginTop: theme.spacing.xs, width: '100%' },
    error: {
      alignItems: 'flex-start',
      backgroundColor: theme.colors.dangerSoft,
      borderColor: theme.colors.danger,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      flexDirection: 'row',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    errorText: { color: theme.colors.danger, flex: 1, lineHeight: 19 },
  })
