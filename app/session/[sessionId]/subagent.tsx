import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { NativeMarkdown } from '@/components/native-markdown'
import { NativeToolCard } from '@/components/native-tool-card'
import { WorkspaceComposer } from '@/components/workspace-composer'
import { WorkspaceShell } from '@/components/workspace-shell'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { projectVisibleMessages, type SharedMessagePresentation } from '@/shared/dsh-presentation'
import { format, t as message } from '@/locale'

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
  const childMode = firstParam(mode) === 'continuable' ? 'continuable' : firstParam(mode) === 'one-shot' ? 'one-shot' : undefined
  const connection = useConnectionStore(state => state.connection)
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const queryClient = useQueryClient()
  const ready = client !== undefined && childId !== undefined && parentId !== undefined && childMode !== undefined
  const history = useQuery({
    queryKey: ['subagent-history', parentId, childId, childMode],
    enabled: ready,
    queryFn: () => {
      if (!client || !parentId || !childId || !childMode) throw new Error(message('subagent.invalidAddress'))
      return client.subagentHistory(parentId, childId, childMode)
    },
  })
  const send = useMutation({
    mutationFn: async (content: Parameters<MobileApi['sendSubagentMessage']>[2]) => {
      if (!client || !parentId || !childId) throw new Error(message('subagent.invalidAddress'))
      return client.sendSubagentMessage(parentId, childId, content)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['subagent-history', parentId, childId, childMode] }),
    onError: error => Alert.alert(message('subagent.sendFailedTitle'), withErrorContext(message('subagent.sendFailedBody'), error)),
  })
  const interrupt = useMutation({
    mutationFn: async () => {
      if (!client || !parentId || !childId) throw new Error(message('subagent.invalidAddress'))
      return client.interruptSubagent(parentId, childId)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['session-subagents', parentId] }),
    onError: error => Alert.alert(message('subagent.stopFailedTitle'), withErrorContext(message('subagent.stopFailedBody'), error)),
  })
  const messages = useMemo(() => projectVisibleMessages(history.data?.items ?? []), [history.data?.items])
  const title = childMode === 'continuable' ? message('subagent.title') : message('subagent.readOnlyTitle')

  return (
    <WorkspaceShell
      title={title}
      showMenu={false}
      leftAction={
        <Pressable
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
        <View style={styles.canvas}>
          <View style={styles.notice}>
            <NativeIcon name="agent-preset-outline" size={16} color={theme.colors.accentText} />
            <Text style={styles.noticeText}>
              {childMode === 'continuable' ? message('subagent.inheritedPermission') : message('subagent.oneShotNotice')}
            </Text>
            {childMode === 'continuable' ? (
              <Pressable
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
          {history.isError ? <ErrorNotice text={withErrorContext(message('subagent.loadFailed'), history.error)} onRetry={() => void history.refetch()} /> : null}
          <FlatList
            data={messages}
            keyExtractor={(item, index) => `subagent-message-${item.sourceSeq ?? index}`}
            renderItem={({ item }) => <MessageRow item={item} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{history.isPending ? message('subagent.loading') : message('subagent.noMessages')}</Text>}
          />
          {childMode === 'continuable' ? (
            <WorkspaceComposer
              disabled={!ready}
              placeholder={message('subagent.composerPlaceholder')}
              onSend={content => send.mutateAsync(content).then(() => undefined)}
              sending={send.isPending}
            />
          ) : null}
        </View>
      )}
    </WorkspaceShell>
  )
}

function MessageRow({ item }: { item: SharedMessagePresentation }): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  if (item.kind === 'user')
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}><Text selectable style={styles.userText}>{item.text}</Text></View>
      </View>
    )
  if (item.kind === 'tool') return <NativeToolCard presentation={item} />
  return <NativeMarkdown markdown={item.text} onCopyCode={async (code) => { await Clipboard.setStringAsync(code) }} />
}

function ErrorNotice({ text, onRetry }: { text: string; onRetry: () => void }): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.errorNotice}>
      <Text style={styles.error}>{text}</Text>
      <NativeActionButton label={message('common.reload')} icon="refresh-outline" variant="secondary" onPress={onRetry} />
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
      <NativeActionButton label={message('interactions.backToSession')} icon="chevron-left-outline" variant="secondary" onPress={() => router.back()} />
    </View>
  )
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value.find(item => item.trim()) : value
  const normalized = candidate?.trim()
  return normalized || undefined
}

function withErrorContext(prefix: string, error: unknown): string {
  return `${prefix}：${mobileErrorMessage(error, message('common.retry'))}`
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    canvas: { flex: 1 },
    headerAction: { alignItems: 'center', height: theme.touch.iconButton, justifyContent: 'center', width: theme.touch.iconButton },
    notice: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
    noticeText: { color: theme.colors.inkMuted, flex: 1, fontSize: 12, lineHeight: 18 },
    stopAction: { alignItems: 'center', height: theme.touch.iconButton, justifyContent: 'center', width: theme.touch.iconButton },
    list: { gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg },
    userRow: { alignItems: 'flex-end' },
    userBubble: { backgroundColor: theme.colors.userBubble, borderRadius: theme.radius.bubble, maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 10 },
    userText: { color: theme.colors.ink, fontSize: 16, lineHeight: 24 },
    empty: { color: theme.colors.inkMuted, paddingVertical: 24, textAlign: 'center' },
    errorNotice: { gap: 6, padding: 12 },
    error: { color: theme.colors.danger },
    unavailable: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center', padding: 28 },
    unavailableText: { color: theme.colors.inkMuted, fontSize: 14, textAlign: 'center' },
    pressed: { opacity: 0.62 },
  })
