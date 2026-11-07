import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { SessionListPayload } from '@/types/mobile'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
  const connection = useConnectionStore((value) => value.connection)
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState(routeTitle ?? '')
  const [edited, setEdited] = useState(false)
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const sessions = useQuery({
    queryKey: queryKeys.sessionList(connection?.gatewayUrl, connection?.deviceId),
    enabled: client !== undefined,
    queryFn: ({ signal }) => {
      if (client === undefined) throw new Error(message('drawer.connectFirstBody'))
      return client.withSignal(signal).listSessions()
    },
    initialData: () =>
      queryClient.getQueryData<SessionListPayload>(queryKeys.sessionList(connection?.gatewayUrl, connection?.deviceId)),
  })
  const currentTitle = sessions.data?.items.find((item) => item.sessionId === sessionId)?.title
  useEffect(() => {
    if (!edited && currentTitle !== undefined) setTitle(currentTitle)
  }, [currentTitle, edited])
  const rename = useMutation({
    mutationFn: async () => {
      const normalized = title.trim()
      if (!client || !sessionId) throw new Error(message('rename.sessionMissing'))
      if (normalized === '') throw new Error(message('rename.sessionEmpty'))
      return client.renameSession(sessionId, normalized)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sessionList(connection?.gatewayUrl, connection?.deviceId),
      })
      router.back()
    },
    onError: (error) => Alert.alert(message('rename.failedTitle'), mobileErrorMessage(error, message('common.retry'))),
  })

  return (
    <WorkspaceShell
      leftAction={
        <Pressable
          android_ripple={{ borderless: false }}
          accessibilityRole="button"
          accessibilityLabel={message('interactions.backToSession')}
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.back}
        >
          <NativeIcon name="chevron-left-outline" color={theme.colors.ink} size={20} />
        </Pressable>
      }
      title={message('rename.sessionTitle')}
      showMenu={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={workspaceKeyboardVerticalOffset(insets.top, false)}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.canvas}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.label}>{message('rename.sessionLabel')}</Text>
          <TextInput
            accessibilityLabel={message('rename.sessionLabel')}
            autoFocus
            editable={!rename.isPending}
            maxLength={200}
            onChangeText={(value) => {
              setEdited(true)
              setTitle(value)
            }}
            onSubmitEditing={() => {
              if (!rename.isPending && title.trim()) rename.mutate()
            }}
            placeholder={message('rename.sessionPlaceholder')}
            placeholderTextColor={theme.colors.inkFaint}
            returnKeyType="done"
            style={styles.input}
            value={title}
          />
          <Text style={styles.hint}>{message('rename.sessionNote')}</Text>
          <NativeActionButton
            label={message('rename.save')}
            icon="check-outline"
            loading={rename.isPending}
            onPress={() => rename.mutate()}
            disabled={!connection || !sessionId || title.trim() === ''}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </WorkspaceShell>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    back: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
    flex: { flex: 1 },
    canvas: { flexGrow: 1, gap: theme.spacing.sm, padding: theme.spacing.lg },
    hint: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    input: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      // `WorkspaceBrowser.module.css .renameInput`: 44 tall, radius 16, 7px 14px,
      // 14/22, and a hairline outline (0.5px on the Web).
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      color: theme.colors.ink,
      fontSize: 14,
      lineHeight: 22,
      minHeight: theme.touch.minTarget,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    label: { color: theme.colors.ink, fontSize: 14, fontWeight: '500', lineHeight: 22 },
    submit: { marginTop: theme.spacing.md },
  })
