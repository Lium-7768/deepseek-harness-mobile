import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
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
import { format, t as message } from '@/locale'

/** Renders the native title editor for one desktop-owned workspace. */
export default function RenameWorkspaceScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { title: rawTitle, workspaceId: rawWorkspaceId } = useLocalSearchParams<{
    title?: string | string[]
    workspaceId?: string | string[]
  }>()
  const workspaceId = firstParam(rawWorkspaceId)
  const connection = useConnectionStore(value => value.connection)
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
      await queryClient.invalidateQueries({ queryKey: ['session-list', connection?.gatewayUrl, connection?.deviceId] })
      router.back()
    },
    onError: error => Alert.alert(message('rename.failedTitle'), mobileErrorMessage(error, message('common.retry'))),
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? workspaceKeyboardVerticalOffset(insets.top, false) : 0}
        style={styles.flex}
      >
      <View style={styles.canvas}>
        <Text style={styles.label}>{message('rename.workspaceLabel')}</Text>
        <TextInput
          accessibilityLabel={message('rename.workspaceLabel')}
          autoFocus
          editable={!rename.isPending}
          maxLength={200}
          onChangeText={setTitle}
          onSubmitEditing={() => void rename.mutateAsync()}
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
          onPress={() => void rename.mutateAsync()}
          disabled={!connection || !workspaceId || title.trim() === ''}
          style={styles.submit}
        />
      </View>
      </KeyboardAvoidingView>
    </WorkspaceShell>
  )
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value.find(item => item.trim()) : value
  return candidate?.trim() || undefined
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    back: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
    flex: { flex: 1 },
    canvas: { flex: 1, gap: theme.spacing.sm, padding: theme.spacing.lg },
    hint: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
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
