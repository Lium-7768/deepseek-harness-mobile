import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { authenticateMobilePassword, mobileErrorMessage } from '@/api/mobile-api'
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
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const setConnection = useConnectionStore(state => state.setConnection)
  const connect = async (): Promise<void> => {
    setError('')
    try {
      setSaving(true)
      const connection = await authenticateMobilePassword({ gatewayUrl: gatewayUrl.trim(), password })
      await setConnection(connection)
      router.replace('/workspace')
    } catch (value) {
      setError(mobileErrorMessage(value, '连接桌面端失败，请检查地址和密码。'))
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
            <Text style={styles.copy}>输入桌面端开启公网访问后显示的地址和密码，即可在任意网络下使用。</Text>
          </View>
          <View style={styles.form}>
            <Field
              label="桌面端地址"
              value={gatewayUrl}
              onChangeText={setGatewayUrl}
              placeholder="https://example.trycloudflare.com"
              keyboardType="url"
            />
            <Field
              label="访问密码"
              value={password}
              onChangeText={setPassword}
              placeholder="桌面端「手机访问」页显示的密码"
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
            <Text style={styles.manualLabel}>桌面上同时显示了配对二维码时，也可以扫码连接。</Text>
            <NativeActionButton
              label="扫描配对二维码"
              icon="link"
              onPress={() => router.push('/connect/scan')}
              variant="secondary"
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
      // Blue is reserved for links, selection, and info; a label uses the muted
      // foreground so it does not compete with the primary action.
      color: theme.colors.inkMuted,
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1.3,
    },
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
