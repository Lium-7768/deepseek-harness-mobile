import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { NativeBrandMark } from '@/components/native-brand-mark'
import { NativeIcon } from '@/components/native-icon'
import { NativeMenuPanel } from '@/components/native-menu-panel'
import { requireClient } from '@/components/route-params'
import { agentPresetLabel, agentPresetName, readPermissionSelect } from '@/components/session-composer-logic'
import {
  selectedSessionTarget,
  sessionDisplayTitle,
  workspaceForSession,
  workspaceLabel,
} from '@/components/session-drawer-logic'
import { WorkspaceComposer } from '@/components/workspace-composer'
import { WorkspaceShell } from '@/components/workspace-shell'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { format, t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useSessionSelectionStore } from '@/state/session-selection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileAgentPresetEntry, MobilePromptContent } from '@/types/mobile'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useNavigation } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, KeyboardAvoidingView, ScrollView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function WorkspaceScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const navigation = useNavigation<{ openDrawer: () => void }>()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const connection = useConnectionStore((state) => state.connection)
  const client = useMemo(() => (connection === undefined ? undefined : new MobileApi(connection)), [connection])
  const selectedSessionId = useSessionSelectionStore((state) => state.selectedSessionId)
  const clearSelection = useSessionSelectionStore((state) => state.clearSelection)
  const restoreSelection = useSessionSelectionStore((state) => state.restoreSelection)
  const restoredConnectionKey = useRef<string | undefined>(undefined)
  const sessions = useQuery({
    queryKey: queryKeys.sessionList(connection?.gatewayUrl, connection?.deviceId),
    enabled: Boolean(connection),
    queryFn: ({ signal }) => requireClient(client, message('workspace.connectFirst')).withSignal(signal).listSessions(),
  })
  const selectedSession = selectedSessionTarget(sessions.data?.items ?? [], selectedSessionId)
  const selectedSessionModels = useQuery({
    queryKey: queryKeys.sessionModels(connection?.gatewayUrl, connection?.deviceId, selectedSession?.sessionId),
    enabled: selectedSession !== undefined && client !== undefined,
    queryFn: ({ signal }) =>
      requireClient(client, message('workspace.connectFirst'))
        .withSignal(signal)
        .sessionModels(requireSelectedSessionId(selectedSession)),
  })
  const selectedSessionHistory = useQuery({
    queryKey: queryKeys.sessionHistory(selectedSession?.sessionId),
    enabled: selectedSession !== undefined && client !== undefined,
    queryFn: ({ signal }) =>
      requireClient(client, message('workspace.connectFirst'))
        .withSignal(signal)
        .sessionHistory(requireSelectedSessionId(selectedSession), { maxMessages: 1 }),
  })
  const presets = useQuery({
    queryKey: queryKeys.agentPresets(connection?.gatewayUrl, connection?.deviceId),
    enabled: client !== undefined,
    queryFn: ({ signal }) => requireClient(client, message('workspace.connectFirst')).withSignal(signal).agentPresets(),
  })
  const selectPreset = useMutation({
    mutationFn: (agentPreset: string) =>
      requireClient(client, message('workspace.connectFirst')).selectSessionPreset(
        requireSelectedSessionId(selectedSession),
        agentPreset,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory() })
    },
    onError: (error) =>
      Alert.alert(message('mode.switchFailedTitle'), mobileErrorMessage(error, message('mode.switchFailedBody'))),
  })
  const selectModel = useMutation({
    mutationFn: (selection: { model: string; provider: string; reasoningEffort?: string }) =>
      requireClient(client, message('workspace.connectFirst')).selectSessionModel(
        requireSelectedSessionId(selectedSession),
        selection,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionModels() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory() })
    },
    onError: (error) =>
      Alert.alert(message('model.switchFailedTitle'), mobileErrorMessage(error, message('model.switchFailedBody'))),
  })
  const selectPermission = useMutation({
    mutationFn: (preset: string) =>
      requireClient(client, message('workspace.connectFirst')).sendMessage(requireSelectedSessionId(selectedSession), [
        { type: 'text', text: `/permission ${preset}` },
      ]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionEvents() })
    },
    onError: (error) =>
      Alert.alert(
        message('permission.switchFailedTitle'),
        mobileErrorMessage(error, message('permission.switchFailedBody')),
      ),
  })
  const selectedWorkspace = workspaceForSession(sessions.data?.workspaces ?? [], selectedSession?.sessionId)
  const workspaceTitle =
    selectedWorkspace === undefined ? message('workspace.sectionTitle') : workspaceLabel(selectedWorkspace)
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
      sessions.data.items.map((item) => item.sessionId),
    )
  }, [connection, restoreSelection, sessions.data])
  useEffect(() => {
    if (
      connection !== undefined &&
      sessions.data !== undefined &&
      selectedSessionId !== undefined &&
      selectedSession === undefined
    ) {
      void clearSelection()
    }
  }, [clearSelection, connection, selectedSession, selectedSessionId, sessions.data])

  const send = async (content: MobilePromptContent): Promise<void> => {
    if (selectedSession === undefined || !connection) {
      Alert.alert(message('workspace.pickSession'), message('workspace.pickSessionFirst'))
      return
    }
    await new MobileApi(connection).sendMessage(selectedSession.sessionId, content)
    router.push({ pathname: '/session/[sessionId]', params: { sessionId: selectedSession.sessionId } })
  }

  return (
    <WorkspaceShell
      showBrand={false}
      title={workspaceTitle}
      titleLeading={<NativeIcon name="folder-open" size={21} color={theme.colors.ink} />}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={workspaceKeyboardVerticalOffset(insets.top, false)}
        style={s.canvas}
      >
        <ScrollView
          contentContainerStyle={s.startScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={s.startPanel}>
            <View style={s.summary}>
              {/* `_wOI4G_root`: the hero is the surface's identity, so it stays put
              whether or not a session is selected. */}
              <View style={s.hero}>
                <NativeBrandMark size={26} />
                <View style={s.heroLine}>
                  <Text style={s.heroTitle}>{message('workspace.heroTitle')}</Text>
                  <Text style={s.heroBadge}>{message('workspace.heroBadge')}</Text>
                </View>
              </View>
              {/* `FQzohq_heroWorkspaceRow`: the workspace/session control and the mode
              control sit on one 28pt row with 8pt radius, not under a label. */}
              <View style={s.controls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    selectedSession === undefined
                      ? message('workspace.pickSession')
                      : format('workspace.currentSessionNamed', { title: sessionDisplayTitle(selectedSession) })
                  }
                  onPress={() => navigation.openDrawer()}
                  style={({ pressed }) => [s.control, pressed && s.pressed]}
                >
                  <NativeIcon name="folder-open-outline" size={16} color={theme.colors.inkMuted} />
                  <Text numberOfLines={1} style={s.controlText}>
                    {selectedSession === undefined
                      ? message('workspace.pickSession')
                      : sessionDisplayTitle(selectedSession)}
                  </Text>
                  <NativeIcon name="chevron-down-outline" size={18} color={theme.colors.inkMuted} />
                </Pressable>
                <ModeTrigger
                  agentPreset={selectedSession?.agentPreset}
                  disabled={!connection || selectedSession === undefined}
                  onSelect={(value) => selectPreset.mutate(value)}
                  presets={presets.data?.presets ?? []}
                  sessionId={selectedSession?.sessionId}
                />
              </View>
            </View>
            <WorkspaceComposer
              key={selectedSession?.sessionId ?? 'workspace'}
              variant="hero"
              agentPreset={selectedSession?.agentPreset}
              model={selectedSessionModels.data?.current}
              placeholder={message('composer.heroPlaceholder')}
              onSend={send}
              onSelectModel={(selection) => (selectedSession === undefined ? undefined : selectModel.mutate(selection))}
              onSelectPermission={(value) =>
                selectedSession === undefined ? undefined : selectPermission.mutate(value)
              }
              modelCatalog={selectedSessionModels.data?.groups}
              permissionLocked={selectedSessionHistory.isPending || selectedSessionHistory.isError}
              permissions={readPermissionSelect(selectedSessionHistory.data?.projections?.values.permissions)}
              sessionId={selectedSession?.sessionId}
              disabled={!connection || sessions.isFetching || sessions.isError || selectedSession === undefined}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </WorkspaceShell>
  )
}

/**
 * Renders the workspace's Agent-preset trigger and its picker.
 *
 * The composer owns the same picker inside a session; this copy serves the
 * workspace surface, which commits the preset before any session exists. Both
 * open `NativeMenuPanel`, so one control shape covers the whole app.
 *
 * @param props - Current preset, availability, and the commit callback.
 * @returns The trigger, and its picker while open.
 */
function ModeTrigger({
  agentPreset,
  disabled,
  onSelect,
  presets,
  sessionId,
}: {
  agentPreset: string | undefined
  disabled: boolean
  onSelect: (agentPreset: string) => void
  presets: MobileAgentPresetEntry[]
  sessionId: string | undefined
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const label = agentPresetLabel(agentPreset)
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          sessionId === undefined
            ? format('workspace.presetModeTrigger', { label })
            : format('workspace.selectMode', { label })
        }
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8 }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [s.modeControl, disabled && s.disabledControl, pressed && s.pressed]}
      >
        <NativeIcon name="agent-preset-outline" size={16} color={theme.colors.inkMuted} />
        <Text numberOfLines={1} style={s.controlText}>
          {label}
        </Text>
        <NativeIcon name="chevron-down-outline" size={17} color={theme.colors.inkMuted} />
      </Pressable>
      <NativeMenuPanel
        groups={[
          {
            options: presets
              .filter((preset) => preset.broken === undefined)
              .map((preset) => ({
                description: preset.description?.trim() || undefined,
                icon: 'agent-preset-outline' as const,
                label: agentPresetName(preset),
                selected: preset.id === (agentPreset ?? 'standard'),
                value: preset.id,
              })),
          },
        ]}
        onClose={() => setOpen(false)}
        onSelect={(value) => onSelect(value)}
        open={open}
        title={message('mode.selectTitle')}
      />
    </>
  )
}

function requireSelectedSessionId(session: ReturnType<typeof selectedSessionTarget>): string {
  if (session === undefined) throw new Error(message('workspace.pickDesktopSession'))
  return session.sessionId
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    canvas: { flex: 1 },
    startScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
    startPanel: { alignSelf: 'center', width: '100%', maxWidth: 760, gap: 12, paddingBottom: 24 },
    // `FQzohq_composerStack`: 8pt between the identity block and the composer.
    summary: { gap: 16, paddingTop: 16 },
    // The desktop's new-session hero: brand mark, 26px/500 headline, and the
    // preview badge on one row (ui-conversation EmptyHero).
    // `_wOI4G_root`/`headline`: a 32pt row inset 24pt, the mark ahead of the title.
    hero: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 32, paddingHorizontal: 24 },
    heroMark: { alignItems: 'center', justifyContent: 'center' },
    heroLine: { flexWrap: 'wrap', rowGap: 4, alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: 7 },
    heroTitle: {
      flexShrink: 1,
      color: theme.colors.ink,
      fontSize: theme.typography.hero,
      fontWeight: '500',
      letterSpacing: 0,
      lineHeight: 32,
    },
    heroBadge: {
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.pill,
      color: theme.colors.accentSoftText,
      fontSize: theme.typography.caption,
      fontWeight: '500',
      overflow: 'hidden',
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    // `FQzohq_heroWorkspaceRow`: pills, not fields, 28pt tall at 13/500.
    controls: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      paddingLeft: 20,
      paddingRight: 16,
    },
    // `_wOI4G_workspace`: an 8pt-radius ghost button, 28pt tall, padded 0 8.
    control: {
      alignItems: 'center',
      borderRadius: theme.radius.sm,
      flexDirection: 'row',
      gap: 4,
      maxWidth: '62%',
      minHeight: 36,
      paddingHorizontal: 8,
    },
    // `T_XHFG_seat`: the same ghost shape as the workspace button beside it.
    modeControl: {
      alignItems: 'center',
      borderRadius: theme.radius.sm,
      flexDirection: 'row',
      gap: 4,
      minHeight: 36,
      flexShrink: 1,
      maxWidth: '100%',
      paddingHorizontal: 8,
    },
    disabledControl: { opacity: 0.5 },
    controlText: { color: theme.colors.ink, flexShrink: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    pressed: { opacity: 0.62 },
  })
