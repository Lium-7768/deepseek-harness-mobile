import { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { firstParam, withErrorContext } from '@/components/route-params'
import { projectNativeConversationRows } from '@/components/session-conversation-logic'
import { MessageRow } from '@/components/session-message-row'
import { WorkspaceComposer } from '@/components/workspace-composer'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { useScreenActive } from '@/hooks/use-screen-active'
import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Renders one desktop-owned direct child without treating the child as an ordinary root session. */
export default function SubagentSessionScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { sessionId, parentSessionId, mode } = useLocalSearchParams<{
    sessionId?: string | string[]
    parentSessionId?: string | string[]
    mode?: string | string[]
  }>()
  const childId = firstParam(sessionId)
  const parentId = firstParam(parentSessionId)
  const childMode =
    firstParam(mode) === 'continuable' ? 'continuable' : firstParam(mode) === 'one-shot' ? 'one-shot' : undefined
  const connection = useConnectionStore((state) => state.connection)
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const queryClient = useQueryClient()
  const active = useScreenActive()
  const insets = useSafeAreaInsets()
  const ready = client !== undefined && childId !== undefined && parentId !== undefined && childMode !== undefined
  const history = useQuery({
    queryKey: queryKeys.subagentHistory(parentId, childId, childMode),
    enabled: ready && active,
    refetchInterval: active ? 2_500 : false,
    refetchIntervalInBackground: false,
    queryFn: ({ signal }) => {
      if (!client || !parentId || !childId || !childMode) throw new Error(message('subagent.invalidAddress'))
      return client.withSignal(signal).subagentHistory(parentId, childId, childMode)
    },
  })
  useEffect(() => {
    if (active)
      void queryClient.invalidateQueries({ queryKey: queryKeys.subagentHistory(parentId, childId, childMode) })
  }, [active, parentId, childId, childMode, queryClient])
  const send = useMutation({
    mutationFn: async (content: Parameters<MobileApi['sendSubagentMessage']>[2]) => {
      if (!client || !parentId || !childId) throw new Error(message('subagent.invalidAddress'))
      return client.sendSubagentMessage(parentId, childId, content)
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.subagentHistory(parentId, childId, childMode) }),
    onError: (error) =>
      Alert.alert(message('subagent.sendFailedTitle'), withErrorContext(message('subagent.sendFailedBody'), error)),
  })
  const interrupt = useMutation({
    mutationFn: async () => {
      if (!client || !parentId || !childId) throw new Error(message('subagent.invalidAddress'))
      return client.interruptSubagent(parentId, childId)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSubagents(parentId) }),
    onError: (error) =>
      Alert.alert(message('subagent.stopFailedTitle'), withErrorContext(message('subagent.stopFailedBody'), error)),
  })
  const messages = useMemo(() => projectNativeConversationRows(history.data?.items ?? []), [history.data?.items])
  const title = childMode === 'continuable' ? message('subagent.title') : message('subagent.readOnlyTitle')

  return (
    <WorkspaceShell
      title={title}
      showMenu={false}
      leftAction={
        <Pressable
          android_ripple={{ borderless: false }}
          accessibilityRole="button"
          accessibilityLabel={message('interactions.backToSession')}
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
        >
          <NativeIcon name="chevron-left-outline" color={theme.colors.ink} size={20} />
        </Pressable>
      }
    >
      {!ready ? (
        <Unavailable text={message('subagent.missingAddress')} />
      ) : (
        <KeyboardAvoidingView
          style={styles.canvas}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={workspaceKeyboardVerticalOffset(insets.top, false)}
        >
          <View style={styles.notice}>
            <NativeIcon name="agent-preset-outline" size={16} color={theme.colors.accentText} />
            <Text style={styles.noticeText}>
              {childMode === 'continuable'
                ? message('subagent.inheritedPermission')
                : message('subagent.oneShotNotice')}
            </Text>
            {childMode === 'continuable' ? (
              <Pressable
                android_ripple={{ borderless: false }}
                accessibilityRole="button"
                accessibilityLabel={message('subagent.stopAction')}
                accessibilityState={{ busy: interrupt.isPending }}
                disabled={interrupt.isPending}
                onPress={() => interrupt.mutate()}
                style={({ pressed }) => [styles.stopAction, pressed && styles.pressed]}
              >
                <NativeIcon name="stop-fill" size={15} color={theme.colors.danger} />
              </Pressable>
            ) : null}
          </View>
          {history.isError ? (
            <ErrorNotice
              text={withErrorContext(message('subagent.loadFailed'), history.error)}
              onRetry={() => void history.refetch()}
            />
          ) : null}
          <FlatList
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            windowSize={9}
            data={messages}
            keyExtractor={(item, index) => `subagent-message-${item.sourceSeq ?? index}`}
            renderItem={({ item }) => <MessageRow item={item} event={undefined} api={undefined} sessionId={childId} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {history.isPending ? message('subagent.loading') : message('subagent.noMessages')}
              </Text>
            }
          />
          {childMode === 'continuable' ? (
            <WorkspaceComposer
              key={childId ?? 'workspace'}
              draftScope={`subagent:${parentId}:${childId}`}
              disabled={!ready}
              placeholder={message('subagent.composerPlaceholder')}
              onSend={(content) => send.mutateAsync(content).then(() => undefined)}
              sending={send.isPending}
            />
          ) : null}
        </KeyboardAvoidingView>
      )}
    </WorkspaceShell>
  )
}

function ErrorNotice({ text, onRetry }: { text: string; onRetry: () => void }): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.errorNotice}>
      <Text style={styles.error}>{text}</Text>
      <NativeActionButton
        label={message('common.reload')}
        icon="refresh-outline"
        variant="secondary"
        onPress={onRetry}
      />
    </View>
  )
}

function Unavailable({ text }: { text: string }): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.unavailable}>
      <NativeIcon name="link-off" size={28} color={theme.colors.inkFaint} />
      <Text style={styles.unavailableText}>{text}</Text>
      <NativeActionButton
        label={message('interactions.backToSession')}
        icon="chevron-left-outline"
        variant="secondary"
        onPress={() => router.back()}
      />
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    canvas: { flex: 1 },
    headerAction: {
      alignItems: 'center',
      height: theme.touch.iconButton,
      justifyContent: 'center',
      width: theme.touch.iconButton,
    },
    notice: {
      alignItems: 'center',
      backgroundColor: theme.colors.accentSoft,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    noticeText: { color: theme.colors.inkTertiary, flex: 1, fontSize: 12, lineHeight: 18 },
    stopAction: {
      alignItems: 'center',
      height: theme.touch.iconButton,
      justifyContent: 'center',
      width: theme.touch.iconButton,
    },
    list: { gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg },
    userRow: { alignItems: 'flex-end' },
    userBubble: {
      backgroundColor: theme.colors.userBubble,
      borderRadius: theme.radius.xl,
      maxWidth: '82%',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    userText: { color: theme.colors.ink, fontSize: 14, lineHeight: 24 },
    empty: { color: theme.colors.inkTertiary, paddingVertical: 24, textAlign: 'center' },
    errorNotice: { gap: 6, padding: 12 },
    error: { color: theme.colors.danger },
    unavailable: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center', padding: 28 },
    unavailableText: { color: theme.colors.inkTertiary, fontSize: 14, lineHeight: 22, textAlign: 'center' },
    pressed: { opacity: 0.62 },
  })
