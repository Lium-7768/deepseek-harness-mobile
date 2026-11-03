import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { firstParam } from '@/components/route-params'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Renders the native title editor for one desktop-owned workspace. */
export default function RenameWorkspaceScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { title: rawTitle, workspaceId: rawWorkspaceId } = useLocalSearchParams<{
    title?: string | string[]
    workspaceId?: string | string[]
  }>()
  const workspaceId = firstParam(rawWorkspaceId)
  const connection = useConnectionStore((value) => value.connection)
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState(firstParam(rawTitle) ?? '')
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const rename = useMutation({
    mutationFn: async () => {
      const normalized = title.trim()
      if (!client || !workspaceId) throw new Error(message('rename.workspaceMissing'))
      if (normalized === '') throw new Error(message('rename.workspaceEmpty'))
      return client.renameWorkspace(workspaceId, normalized)
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
          accessibilityRole="button"
          accessibilityLabel={message('rename.backToWorkspace')}
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.back}
        >
          <NativeIcon name="chevron-left-outline" color={theme.colors.ink} size={20} />
        </Pressable>
      }
      title={message('rename.workspaceTitle')}
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
          <Text style={styles.label}>{message('rename.workspaceLabel')}</Text>
          <TextInput
            accessibilityLabel={message('rename.workspaceLabel')}
            autoFocus
            editable={!rename.isPending}
            maxLength={200}
            onChangeText={setTitle}
            onSubmitEditing={() => {
              if (!rename.isPending && title.trim()) rename.mutate()
            }}
            placeholder={message('rename.workspacePlaceholder')}
            placeholderTextColor={theme.colors.inkFaint}
            returnKeyType="done"
            style={styles.input}
            value={title}
          />
          <Text style={styles.hint}>{message('rename.workspaceNote')}</Text>
          <NativeActionButton
            label={message('rename.save')}
            icon="check-outline"
            loading={rename.isPending}
            onPress={() => rename.mutate()}
            disabled={!connection || !workspaceId || title.trim() === ''}
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
