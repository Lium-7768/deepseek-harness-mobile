import { useQuery } from '@tanstack/react-query'
import { router, useNavigation } from 'expo-router'
import { useEffect, useMemo, useRef } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { NativeIcon } from '@/components/native-icon'
import { agentPresetLabel, readPermissionSelect } from '@/components/session-composer-logic'
import { formatSessionTime, selectedSessionTarget, sessionDisplayTitle, workspaceForSession, workspaceLabel } from '@/components/session-drawer-logic'
import { WorkspaceComposer } from '@/components/workspace-composer'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { useConnectionStore } from '@/state/connection'
import { useSessionSelectionStore } from '@/state/session-selection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobilePromptContent } from '@/types/mobile'

export default function WorkspaceScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const navigation = useNavigation<{ openDrawer: () => void }>()
  const insets = useSafeAreaInsets()
  const connection = useConnectionStore(state => state.connection)
  const client = useMemo(() => (connection === undefined ? undefined : new MobileApi(connection)), [connection])
  const selectedSessionId = useSessionSelectionStore(state => state.selectedSessionId)
  const selectSessionId = useSessionSelectionStore(state => state.selectSession)
  const clearSelection = useSessionSelectionStore(state => state.clearSelection)
  const restoreSelection = useSessionSelectionStore(state => state.restoreSelection)
  const restoredConnectionKey = useRef<string | undefined>(undefined)
  const sessions = useQuery({
    queryKey: ['session-list', connection?.gatewayUrl, connection?.deviceId],
    enabled: Boolean(connection),
    queryFn: () => requireClient(client).listSessions(),
  })
  const selectedSession = selectedSessionTarget(sessions.data?.items ?? [], selectedSessionId)
  const selectedSessionModels = useQuery({
    queryKey: ['session-models', connection?.gatewayUrl, connection?.deviceId, selectedSession?.sessionId],
    enabled: selectedSession !== undefined && client !== undefined,
    queryFn: () => requireClient(client).sessionModels(requireSelectedSessionId(selectedSession)),
  })
  const selectedSessionHistory = useQuery({
    queryKey: ['session-history', selectedSession?.sessionId],
    enabled: selectedSession !== undefined && client !== undefined,
    queryFn: () => requireClient(client).sessionHistory(requireSelectedSessionId(selectedSession), { maxMessages: 1 }),
  })
  const selectedWorkspace = workspaceForSession(sessions.data?.workspaces ?? [], selectedSession?.sessionId)
  const workspaceTitle = selectedWorkspace === undefined ? '工作区' : workspaceLabel(selectedWorkspace)
  useEffect(() => {
    if (connection === undefined) {
      restoredConnectionKey.current = undefined
      void clearSelection()
    }
  }, [clearSelection, connection])
  useEffect(() => {
    if (connection === undefined || sessions.data === undefined) return
    const connectionKey = `${connection.gatewayUrl}:${connection.deviceId}`
    if (restoredConnectionKey.current === connectionKey) return
    restoredConnectionKey.current = connectionKey
    void restoreSelection(
      connection,
      sessions.data.items.map(item => item.sessionId),
    )
  }, [connection, restoreSelection, sessions.data])
  useEffect(() => {
    if (connection !== undefined && sessions.data !== undefined && selectedSessionId !== undefined && selectedSession === undefined) {
      void clearSelection()
    }
  }, [clearSelection, connection, selectedSession, selectedSessionId, sessions.data])
  const selectSession = (sessionId: string): void => {
    if (connection === undefined) return
    void selectSessionId(connection, sessionId)
    router.push({ pathname: '/session/[sessionId]', params: { sessionId } })
  }
  const send = async (content: MobilePromptContent): Promise<void> => {
    if (selectedSession === undefined || !connection) {
      Alert.alert('选择会话', '请先选择一个会话后再发送。')
      return
    }
    await new MobileApi(connection).sendMessage(selectedSession.sessionId, content)
    router.push({ pathname: '/session/[sessionId]', params: { sessionId: selectedSession.sessionId } })
  }

  return (
    <WorkspaceShell
      showBrand={false}
      title={workspaceTitle}
      titleLeading={<NativeIcon name="folder" size={21} color={theme.colors.ink} />}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? workspaceKeyboardVerticalOffset(insets.top, true) : 0}
        style={s.canvas}
      >
        <View style={s.summary}>
          <Text style={s.summaryLabel}>{selectedSession === undefined ? '选择桌面会话' : '当前会话'}</Text>
          <View style={s.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                selectedSession === undefined ? '选择会话' : `当前会话：${sessionDisplayTitle(selectedSession)}`
              }
              onPress={() => navigation.openDrawer()}
              style={({ pressed }) => [s.control, pressed && s.pressed]}
            >
              <NativeIcon name="chat-bubble-outline" size={16} color={theme.colors.inkMuted} />
              <Text numberOfLines={1} style={s.controlText}>
                {selectedSession === undefined ? '选择会话' : sessionDisplayTitle(selectedSession)}
              </Text>
              <NativeIcon name="expand-more" size={18} color={theme.colors.inkMuted} />
            </Pressable>
            <ModeTrigger agentPreset={selectedSession?.agentPreset} disabled={!connection} sessionId={selectedSession?.sessionId} />
          </View>
          <Text style={s.detail}>
            {workspaceDetail(
              connection,
              sessions,
              selectedSession === undefined ? undefined : formatSessionTime(selectedSession.updatedAt),
            )}
          </Text>
        </View>
        <WorkspaceComposer
          agentPreset={selectedSession?.agentPreset}
          model={selectedSessionModels.data?.current}
          onSend={send}
          permissions={readPermissionSelect(selectedSessionHistory.data?.projections?.values.permissions)}
          sessionId={selectedSession?.sessionId}
          disabled={!connection || sessions.isFetching || sessions.isError || selectedSession === undefined}
        />
      </KeyboardAvoidingView>
    </WorkspaceShell>
  )
}

function ModeTrigger({
  agentPreset,
  disabled,
  sessionId,
}: {
  agentPreset: string | undefined
  disabled: boolean
  sessionId: string | undefined
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const label = agentPresetLabel(agentPreset)
  const openMode = (): void => {
    if (disabled) return
    if (sessionId !== undefined) {
      router.push({ pathname: '/session/[sessionId]/mode', params: { sessionId } })
      return
    }
    router.push('/settings?section=general')
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sessionId === undefined ? `设置新会话默认模式：${label}` : `选择智能体模式：${label}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8 }}
      onPress={openMode}
      style={({ pressed }) => [s.modeControl, disabled && s.disabledControl, pressed && s.pressed]}
    >
      <NativeIcon name="agent-preset" size={16} color={theme.colors.inkMuted} />
      <Text numberOfLines={1} style={s.controlText}>
        {label}
      </Text>
      <NativeIcon name="chevron-down" size={17} color={theme.colors.inkMuted} />
    </Pressable>
  )
}

function requireClient(client: MobileApi | undefined): MobileApi {
  if (client === undefined) throw new Error('请先连接桌面端。')
  return client
}

function requireSelectedSessionId(session: ReturnType<typeof selectedSessionTarget>): string {
  if (session === undefined) throw new Error('请先选择一个桌面会话。')
  return session.sessionId
}

function workspaceDetail(
  connection: ReturnType<typeof useConnectionStore.getState>['connection'],
  sessions: ReturnType<typeof useQuery<Awaited<ReturnType<MobileApi['listSessions']>>>>,
  selectedTime: string | undefined,
): string {
  if (!connection) return '请先连接桌面端。'
  if (sessions.isPending) return '正在加载桌面工作区…'
  if (sessions.isError) return `桌面工作区加载失败：${errorMessage(sessions.error)}`
  const count = sessions.data?.items.length ?? 0
  if (count === 0) return '桌面端暂无会话，请在桌面端创建会话。'
  return selectedTime === undefined ? `已连接桌面端 · ${count} 个会话` : `最近更新 · ${selectedTime}`
}

function errorMessage(error: unknown): string {
  return mobileErrorMessage(error, '请稍后重试。')
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
  canvas: { flex: 1, justifyContent: 'space-between' },
  summary: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg },
  summaryLabel: { color: theme.colors.inkMuted, fontSize: 12, fontWeight: '700' },
  controls: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  control: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: theme.touch.minTarget,
    paddingHorizontal: 11,
  },
  modeControl: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 7,
    minHeight: theme.touch.minTarget,
    paddingHorizontal: 11,
  },
  disabledControl: { opacity: 0.5 },
  controlText: { color: theme.colors.ink, flexShrink: 1, fontSize: 13, fontWeight: '500' },
  detail: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.62 },
})
