import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { SessionListPayload } from '@/types/mobile'

/** Renders the native title editor for one desktop-owned session. */
export default function RenameSessionScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { sessionId: rawSessionId, title: rawTitle } = useLocalSearchParams<{
    sessionId?: string | string[]
    title?: string | string[]
  }>()
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId
  const routeTitle = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle
  const connection = useConnectionStore(value => value.connection)
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState(routeTitle ?? '')
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const sessions = useQuery({
    queryKey: ['session-list', connection?.gatewayUrl, connection?.deviceId],
    enabled: client !== undefined,
    queryFn: () => {
      if (client === undefined) throw new Error('请先连接桌面端。')
      return client.listSessions()
    },
    initialData: () =>
      queryClient.getQueryData<SessionListPayload>(['session-list', connection?.gatewayUrl, connection?.deviceId]),
  })
  const currentTitle = sessions.data?.items.find(item => item.sessionId === sessionId)?.title
  useEffect(() => {
    if (title === '' && currentTitle !== undefined) setTitle(currentTitle)
  }, [currentTitle, title])
  const rename = useMutation({
    mutationFn: async () => {
      const normalized = title.trim()
      if (!client || !sessionId) throw new Error('请先连接桌面端并从会话列表打开会话。')
      if (normalized === '') throw new Error('会话标题不能为空。')
      return client.renameSession(sessionId, normalized)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session-list', connection?.gatewayUrl, connection?.deviceId] })
      router.back()
    },
    onError: error => Alert.alert('重命名失败', mobileErrorMessage(error, '请稍后重试。')),
  })

  return (
    <WorkspaceShell
      leftAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回会话"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.back}
        >
          <NativeIcon name="arrow-back" color={theme.colors.ink} size={20} />
        </Pressable>
      }
      title="重命名会话"
      showMenu={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? workspaceKeyboardVerticalOffset(insets.top, false) : 0}
        style={styles.flex}
      >
      <View style={styles.canvas}>
        <Text style={styles.label}>会话标题</Text>
        <TextInput
          accessibilityLabel="会话标题"
          autoFocus
          editable={!rename.isPending}
          maxLength={200}
          onChangeText={setTitle}
          onSubmitEditing={() => void rename.mutateAsync()}
          placeholder="输入会话标题"
          placeholderTextColor={theme.colors.inkFaint}
          returnKeyType="done"
          style={styles.input}
          value={title}
        />
        <Text style={styles.hint}>标题会同步到桌面 Web 的同一会话。</Text>
        <NativeActionButton
          label="保存"
          icon="check"
          loading={rename.isPending}
          onPress={() => void rename.mutateAsync()}
          disabled={!connection || !sessionId || title.trim() === ''}
          style={styles.submit}
        />
      </View>
      </KeyboardAvoidingView>
    </WorkspaceShell>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    back: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
    flex: { flex: 1 },
    canvas: { flex: 1, gap: theme.spacing.sm, padding: theme.spacing.lg },
    hint: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 19 },
    input: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.control,
      borderWidth: StyleSheet.hairlineWidth,
      color: theme.colors.ink,
      fontSize: 16,
      minHeight: theme.touch.minTarget,
      paddingHorizontal: theme.spacing.md,
    },
    label: { color: theme.colors.ink, fontSize: 14, fontWeight: '700' },
    submit: { marginTop: theme.spacing.md },
  })
