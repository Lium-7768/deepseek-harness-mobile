import { MobileApi } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { ConfirmSheet } from '@/components/confirm-sheet'
import { tapFeedback, warnFeedback } from '@/components/haptics'
import { DrawerViewMenu } from '@/components/drawer-view-menu'
import { DrawerSearchInput, DrawerSearchRow } from '@/components/drawer-search'
import {
  drawerSearchResults,
  drawerViewRows,
  initialDrawerOrders,
  moveDrawerSession,
} from '@/components/drawer-view-logic'
import { defaultDrawerView, useDrawerViewStore } from '@/state/drawer-view'
import { showSnackbar } from '@/state/snackbar'
import { NativeBrandMark } from '@/components/native-brand-mark'
import Constants from 'expo-constants'
import { NativeIcon } from '@/components/native-icon'
import { NativeListRow } from '@/components/native-list'
import { SessionItem, WorkspaceItem } from '@/components/session-drawer-items'
import { runningSubagentCounts, sessionDisplayTitle, sessionIdFromRoute } from '@/components/session-drawer-logic'
import { makeSessionDrawerStyles } from '@/components/session-drawer-styles'
import { shareSessionLog } from '@/export/session-log-share'
import { format, t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useMobileSyncStore } from '@/state/mobile-sync'
import { useSessionSelectionStore } from '@/state/session-selection'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { SessionSummary } from '@/types/mobile'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { DrawerContentScrollView, useDrawerStatus, type DrawerContentComponentProps } from 'expo-router/drawer'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Renders the root Expo Router drawer content for session navigation.
 *
 * The root drawer owns opening, closing, and animation. This component owns only
 * the session query and the list presentation, so the workspace cannot mount a
 * second modal drawer.
 *
 * @param props - Navigation state and helpers supplied by the root drawer.
 * @returns The native session drawer content.
 */
/** Shortest window the manual sync spinner stays on screen. */
const SYNC_FEEDBACK_MS = 900

export function SessionDrawer(props: DrawerContentComponentProps): React.JSX.Element {
  const appVersion = Constants.expoConfig?.version ?? '0.1.0'
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const styles = useThemedStyles(makeSessionDrawerStyles)
  const { navigation, state } = props
  const drawerStatus = useDrawerStatus()
  const [searchOpen, setSearchOpen] = useState(false)
  const [confirm, setConfirm] = useState<
    | { kind: 'archive'; session: SessionSummary; activity?: readonly string[] }
    | { kind: 'deleteWorkspace'; title: string; workspaceId: string }
    | undefined
  >(undefined)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedText(search.trim(), 250)
  const [optionsOpen, setOptionsOpen] = useState(false)

  const [collapsedWorkspaceKeys, setCollapsedWorkspaceKeys] = useState<Set<string>>(() => new Set())
  const [expandedWorkspaceSessionKeys, setExpandedWorkspaceSessionKeys] = useState<Set<string>>(() => new Set())
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState<string | undefined>()
  const connection = useConnectionStore((value) => value.connection)
  const scope = JSON.stringify([connection?.gatewayUrl, connection?.deviceId])
  const view = useDrawerViewStore((state) => state.views[scope] ?? defaultDrawerView)
  const updateView = useDrawerViewStore((state) => state.update)
  const { groupBy, orderBy, archivedFilter } = view
  useEffect(() => {
    void useDrawerViewStore.getState().initialize()
  }, [])
  const clearSearch = (): void => {
    setSearch('')
    setSearchOpen(false)
    Keyboard.dismiss()
  }
  useEffect(() => {
    if (drawerStatus === 'closed') {
      setOptionsOpen(false)
      setSearch('')
      setSearchOpen(false)
    }
  }, [drawerStatus])

  // The manual-sync flag lives in the transport store: restarting the stream can
  // remount this content, and a component-local flag would lose the spinner.
  const syncing = useMobileSyncStore((value) => value.syncing)
  const setSyncing = useMobileSyncStore((value) => value.setSyncing)
  const selectSession = useSessionSelectionStore((value) => value.selectSession)
  const queryClient = useQueryClient()
  // The drawer opens onto whatever the list already holds. A refresh on open
  // would replace the rows the thumb is aiming at, and the session mutations
  // below invalidate this key themselves, so freshness never depends on a pull.
  const query = useQuery({
    queryKey: queryKeys.sessionList(connection?.gatewayUrl, connection?.deviceId),
    enabled: Boolean(connection),
    queryFn: ({ signal }) => new MobileApi(requireConnection(connection)).withSignal(signal).listSessions(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })
  const contentSearch = useQuery({
    queryKey: queryKeys.sessionSearch(connection?.gatewayUrl, connection?.deviceId, debouncedSearch),
    enabled: Boolean(connection) && debouncedSearch.length > 0 && debouncedSearch === search.trim(),
    queryFn: ({ signal }) =>
      new MobileApi(requireConnection(connection)).withSignal(signal).searchSessions(debouncedSearch),
  })
  const currentSessionId = currentSessionFromState(state)
  const archivedSessionIds = useMemo(
    () => new Set(query.data?.archivedSessionIds ?? []),
    [query.data?.archivedSessionIds],
  )
  const pinnedSessionIds = useMemo(() => new Set(query.data?.pinnedSessionIds ?? []), [query.data?.pinnedSessionIds])
  const allSessions = query.data?.items ?? []
  const runningSubagents = useMemo(() => runningSubagentCounts(allSessions), [allSessions])
  const workspaces = query.data?.workspaces ?? []
  const searchActive = search.trim().length > 0
  const remoteCurrent = debouncedSearch === search.trim()
  const searchResults = drawerSearchResults(
    allSessions,
    workspaces,
    search,
    archivedSessionIds,
    archivedFilter,
    remoteCurrent ? (contentSearch.data?.items ?? []) : [],
  )
  const searchPending = !remoteCurrent || contentSearch.isPending || contentSearch.isFetching
  const { rows, visibleRows } = drawerViewRows(
    allSessions,
    workspaces,
    archivedSessionIds,
    view,
    currentSessionId,
    collapsedWorkspaceKeys,
    expandedWorkspaceSessionKeys,
    pinnedSessionIds,
  )
  const pickOrder = (next: 'manual' | 'updated'): void => {
    updateView(scope, {
      orderBy: next,
      ...(next === 'manual' ? { orders: initialDrawerOrders(allSessions, workspaces, view.orders) } : {}),
    })
  }
  const moveSession = (id: string, direction: -1 | 1): void => {
    updateView(scope, { orders: moveDrawerSession(allSessions, workspaces, archivedSessionIds, view, id, direction) })
  }

  // The vendored drawer only honours CLOSE_DRAWER when it is addressed to the
  // drawer navigator's own state key (`DrawerView`'s `handleDrawerClose`); a
  // bare `navigation.closeDrawer()` is a no-op here, so the action carries the
  // target the same way the drawer's own item list does.
  const closeDrawer = (): void => {
    navigation.dispatch({ type: 'CLOSE_DRAWER', target: state.key })
  }
  const openSession = (sessionId: string): void => {
    if (archivedSessionIds.has(sessionId)) {
      Alert.alert(message('drawer.archiveDone'), message('drawer.archivedNotOpenable'))
      return
    }
    clearSearch()
    closeDrawer()
    if (connection !== undefined) void selectSession(connection, sessionId)
    if (sessionId !== currentSessionId) router.push({ pathname: '/session/[sessionId]', params: { sessionId } })
  }
  /**
   * Re-syncs everything the drawer can show: the session list, the open
   * session's history and transport caches, and the SSE stream itself. The
   * stream restart matters most — a dropped connection leaves the list frozen
   * with no other way to recover short of restarting the app.
   */
  const syncSessions = async (): Promise<void> => {
    setSyncing(true)
    const startedAt = Date.now()
    useMobileSyncStore.getState().restartStream()
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionList() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionEvents() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionQueue() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionJobs() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionInteractions() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionSubagents() }),
      ])
    } finally {
      // A local refresh answers in tens of milliseconds; without a floor the
      // spinner never paints and the tap reads as ignored.
      const remaining = SYNC_FEEDBACK_MS - (Date.now() - startedAt)
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining))
      setSyncing(false)
    }
  }
  const openSettings = (): void => {
    closeDrawer()
    // A section route shares this pathname, so only the bare index replaces the
    // entry; otherwise the drawer's Settings row would leave the section in place.
    if (state.routes[state.index]?.name !== 'settings') router.push('/settings')
    else router.replace('/settings')
  }
  const toggleWorkspace = (workspaceKey: string): void =>
    setCollapsedWorkspaceKeys((current) => {
      const next = new Set(current)
      if (next.has(workspaceKey)) next.delete(workspaceKey)
      else next.add(workspaceKey)
      return next
    })
  const toggleWorkspaceSessions = (workspaceKey: string): void =>
    setExpandedWorkspaceSessionKeys((current) => {
      const next = new Set(current)
      if (next.has(workspaceKey)) next.delete(workspaceKey)
      else next.add(workspaceKey)
      return next
    })
  const refreshSessions = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionList(connection?.gatewayUrl, connection?.deviceId) }),
    ])
  }
  const createSession = async (): Promise<void> => {
    try {
      const created = await new MobileApi(requireConnection(connection)).createSession()
      await refreshSessions()
      openSession(created.sessionId)
    } catch (error) {
      Alert.alert(
        message('drawer.newSessionFailedTitle'),
        error instanceof Error ? error.message : message('common.retry'),
      )
    }
  }
  const forkSession = async (sessionId: string): Promise<void> => {
    try {
      const created = await new MobileApi(requireConnection(connection)).forkSession(sessionId)
      await refreshSessions()
      openSession(created.sessionId)
    } catch (error) {
      Alert.alert(message('drawer.forkFailedTitle'), error instanceof Error ? error.message : message('common.retry'))
    }
  }
  // One export per session at a time: paging a long log and writing the file is
  // slow enough for a second tap to start a duplicate share sheet otherwise.
  const exportingSessions = useRef(new Set<string>())
  const exportSession = async (session: SessionSummary): Promise<void> => {
    if (exportingSessions.current.has(session.sessionId)) return
    exportingSessions.current.add(session.sessionId)
    try {
      const outcome = await shareSessionLog(new MobileApi(requireConnection(connection)), {
        sessionId: session.sessionId,
        title: sessionDisplayTitle(session),
      })
      if (outcome === 'empty') Alert.alert(message('log.emptyTitle'), message('log.emptyBody'))
      if (outcome === 'unsupported') Alert.alert(message('log.unsupportedTitle'), message('log.unsupportedBody'))
    } catch (error) {
      Alert.alert(message('log.failedTitle'), error instanceof Error ? error.message : message('common.retry'))
    } finally {
      exportingSessions.current.delete(session.sessionId)
    }
  }
  const restoring = useRef(new Set<string>())
  const restoreSession = async (sessionId: string): Promise<void> => {
    if (restoring.current.has(sessionId)) return
    restoring.current.add(sessionId)
    try {
      await new MobileApi(requireConnection(connection)).unarchiveSession(sessionId)
      await refreshSessions()
    } catch (error) {
      Alert.alert(message('drawer.restoreFailed'), error instanceof Error ? error.message : message('common.retry'))
    } finally {
      restoring.current.delete(sessionId)
    }
  }
  const archiveSession = async (sessionId: string, stopFirst = false): Promise<void> => {
    try {
      const api = new MobileApi(requireConnection(connection))
      // Archiving leaves running work without a visible owner, so the confirmed path
      // stops it first; the stopped work does not resume when the session is restored.
      if (stopFirst) await api.cancelSession(sessionId).catch(() => undefined)
      await api.archiveSession(sessionId)
      await refreshSessions()
      if (sessionId === currentSessionId) router.replace('/workspace')
      // Archiving is reversible and easy to hit by accident, so the row's own restore
      // path is offered for a few seconds instead of a confirmation dialog.
      showSnackbar(message('drawer.archived'), () => void restoreSession(sessionId))
    } catch (error) {
      Alert.alert(
        message('drawer.archiveFailedTitle'),
        error instanceof Error ? error.message : message('common.retry'),
      )
    }
  }
  const deleteWorkspace = async (workspaceId: string): Promise<void> => {
    try {
      await new MobileApi(requireConnection(connection)).deleteWorkspace(workspaceId)
      await refreshSessions()
      setExpandedWorkspaceId(undefined)
    } catch (error) {
      Alert.alert(
        message('drawer.removeWorkspaceFailedTitle'),
        error instanceof Error ? error.message : message('common.retry'),
      )
    }
  }
  const confirmDeleteWorkspace = (workspaceId: string, title: string): void => {
    setConfirm({ kind: 'deleteWorkspace', title, workspaceId })
  }
  /**
   * Confirms an archive that would also stop work the reader can still lose.
   *
   * The desktop names what its Stop-and-archive path will end; the phone reads the same
   * two rosters before confirming, and a session with nothing running keeps the plain
   * archive plus its undo, which is the reversible path.
   */
  const confirmArchive = async (session: SessionSummary): Promise<void> => {
    if (session.running !== true) {
      setConfirm({ kind: 'archive', session })
      return
    }
    const api = new MobileApi(requireConnection(connection))
    const activity: string[] = [message('drawer.archiveActivityTurn')]
    try {
      const [jobs, subagents] = await Promise.all([
        api.sessionJobs(session.sessionId),
        api.subagents(session.sessionId),
      ])
      const runningJobs = jobs.items.filter((job) => job.status === 'running').length
      if (runningJobs > 0) activity.push(format('drawer.archiveActivityJobs', { count: runningJobs }))
      const runningAgents = subagents.entries.filter(
        (entry) => entry.kind === 'child' && entry.activity === 'running',
      ).length
      if (runningAgents > 0) activity.push(format('drawer.archiveActivitySubagents', { count: runningAgents }))
    } catch {
      // The roster is an explanation, not a prerequisite: an unreadable roster still
      // lets the reader stop and archive the turn it definitely has.
    }
    setConfirm({ kind: 'archive', session, activity })
  }
  const togglePin = async (session: SessionSummary): Promise<void> => {
    const wasPinned = pinnedSessionIds.has(session.sessionId)
    try {
      await new MobileApi(requireConnection(connection)).pinSession(session.sessionId, !wasPinned)
      await refreshSessions()
      showSnackbar(message(wasPinned ? 'drawer.unpinned' : 'drawer.pinned'))
    } catch (error) {
      Alert.alert(
        message(wasPinned ? 'drawer.unpinFailed' : 'drawer.pinFailed'),
        error instanceof Error ? error.message : message('common.retry'),
      )
    }
  }
  const copySessionId = async (session: SessionSummary): Promise<void> => {
    await Clipboard.setStringAsync(session.sessionId)
    tapFeedback()
    showSnackbar(message('drawer.sessionIdCopied'))
  }

  return (
    <SafeAreaView edges={['top', 'left', 'bottom']} style={styles.drawerSafe}>
      <View style={styles.drawerFrame}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top}
          style={styles.drawerChrome}
          accessibilityElementsHidden={optionsOpen}
          importantForAccessibility={optionsOpen ? 'no-hide-descendants' : 'auto'}
        >
          <View style={styles.drawerHeader}>
            <View style={styles.brandRow}>
              <View style={styles.brandColumn}>
                <View style={styles.brand}>
                  <NativeBrandMark size={24} />
                  <Text numberOfLines={1} style={styles.brandWord}>
                    deepseek
                  </Text>
                  <Text style={styles.brandTag}>HARNESS</Text>
                </View>
                {/* The desktop's brand block carries its build line under the wordmark;
                    the phone names the same thing with the bundle's own version. */}
                <Text numberOfLines={1} style={styles.brandVersion}>
                  {format('drawer.buildVersion', { version: appVersion })}
                </Text>
              </View>
              <Pressable
                android_ripple={{ borderless: false }}
                accessibilityRole="button"
                accessibilityLabel={message('drawer.close')}
                hitSlop={8}
                onPress={closeDrawer}
                style={({ pressed }) => [styles.topIcon, pressed && styles.pressed]}
              >
                <NativeIcon name="close-outline" size={16} color={theme.colors.inkMuted} />
              </Pressable>
            </View>

            <Pressable
              android_ripple={{ borderless: false }}
              accessibilityRole="button"
              accessibilityLabel={message('drawer.newSession')}
              disabled={!connection}
              onPress={() => void createSession()}
              style={({ pressed }) => [
                styles.newSession,
                !connection && styles.disabledAction,
                pressed && styles.pressed,
              ]}
            >
              <NativeIcon
                name="new-chat-outline"
                size={16}
                color={connection ? theme.colors.ink : theme.colors.inkFaint}
              />
              <Text numberOfLines={1} style={connection ? styles.newSessionText : styles.newSessionTextDisabled}>
                {connection ? message('drawer.newSession') : message('drawer.connectFirst')}
              </Text>
            </Pressable>

            <View style={styles.navEntries}>
              <DrawerNavChip
                icon="plugin-pinwheel-outline"
                label={message('drawer.plugins')}
                onPress={() => {
                  closeDrawer()
                  router.push({ pathname: '/settings', params: { section: 'plugins' } })
                }}
              />
              <DrawerNavChip
                icon="clock-outline"
                label={message('drawer.automations')}
                onPress={() => {
                  closeDrawer()
                  router.push('/schedules')
                }}
              />
              <DrawerNavChip icon="settings-outline" label={message('settings.title')} onPress={openSettings} />
            </View>
            <View style={styles.workspaceHeader}>
              {searchOpen ? (
                <DrawerSearchInput value={search} onChange={setSearch} onClose={clearSearch} />
              ) : (
                <>
                  <Text style={styles.workspaceTitle}>
                    {groupBy === 'flat' ? message('drawer.sessions') : message('drawer.workspaces')}
                  </Text>
                  <View style={styles.workspaceActions}>
                    <Pressable
                      android_ripple={{ borderless: false }}
                      accessibilityRole="button"
                      accessibilityLabel={message('drawer.searchSessions')}
                      accessibilityState={{ expanded: searchOpen }}
                      onPress={() => {
                        setOptionsOpen(false)
                        setSearchOpen(true)
                      }}
                      style={({ pressed }) => [styles.actionIcon, pressed && styles.pressed]}
                    >
                      <NativeIcon name="search-outline" size={16} color={theme.colors.inkMuted} />
                    </Pressable>
                    <Pressable
                      android_ripple={{ borderless: false }}
                      accessibilityRole="button"
                      accessibilityLabel={message('drawer.viewSettings')}
                      accessibilityState={{ expanded: optionsOpen }}
                      onPress={() => {
                        Keyboard.dismiss()
                        setOptionsOpen((current) => !current)
                      }}
                      style={({ pressed }) => [
                        styles.actionIcon,
                        optionsOpen && styles.selected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <NativeIcon name="sliders-two-outline" size={16} color={theme.colors.inkMuted} />
                    </Pressable>
                    <Pressable
                      android_ripple={{ borderless: false }}
                      accessibilityLabel={message('drawer.syncSessions')}
                      accessibilityRole="button"
                      accessibilityState={{ busy: syncing, disabled: syncing }}
                      disabled={syncing}
                      onPress={() => void syncSessions()}
                      style={({ pressed }) => [styles.actionIcon, pressed && styles.pressed]}
                    >
                      {syncing ? (
                        <ActivityIndicator color={theme.colors.inkMuted} size="small" />
                      ) : (
                        <NativeIcon name="refresh-outline" size={16} color={theme.colors.inkMuted} />
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
          <DrawerContentScrollView
            {...props}
            contentContainerStyle={styles.drawerContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            style={styles.drawerScroll}
          >
            <View style={styles.listArea}>
              <View style={styles.list}>
                {searchActive ? (
                  <>
                    {searchResults.items.map((result) => (
                      <DrawerSearchRow
                        key={result.session.sessionId}
                        result={result}
                        selected={result.session.sessionId === currentSessionId}
                        onPress={() => openSession(result.session.sessionId)}
                        onRestore={() => void restoreSession(result.session.sessionId)}
                      />
                    ))}
                    {searchPending ? (
                      <View
                        accessibilityRole="progressbar"
                        accessibilityLabel={message('drawer.searching')}
                        style={styles.searchSkeletons}
                      >
                        {(searchResults.items.length === 0 ? [0, 1] : [0]).map((index) => (
                          <View key={index} style={styles.searchSkeleton}>
                            <View style={styles.skeletonLine} />
                            <View style={[styles.skeletonLine, styles.skeletonShort]} />
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {!searchPending && contentSearch.isError ? (
                      <Text accessibilityRole="alert" style={styles.searchHint}>
                        {message('drawer.searchFailed')}
                      </Text>
                    ) : null}
                    {!searchPending && searchResults.items.length === 0 && !contentSearch.isError ? (
                      <Text style={styles.emptyState}>{message('drawer.noSearchResults')}</Text>
                    ) : null}
                    {searchResults.hasMore || (remoteCurrent && contentSearch.data?.hasMore) ? (
                      <Text style={styles.searchHint}>{message('drawer.searchTooManyResults')}</Text>
                    ) : null}
                  </>
                ) : rows.length === 0 ? (
                  query.isFetching ? (
                    <ActivityIndicator color={theme.colors.accent} style={styles.emptyState} />
                  ) : (
                    <Text style={styles.emptyState}>
                      {query.isError
                        ? message('drawer.sessionsLoadFailed')
                        : searchActive && contentSearch.isPending
                          ? message('drawer.searching')
                          : searchActive && contentSearch.isError
                            ? message('drawer.searchFailed')
                            : searchActive
                              ? message('drawer.noSearchResults')
                              : message('drawer.noSessions')}
                    </Text>
                  )
                ) : (
                  visibleRows.map((item) =>
                    item.kind === 'workspace' ? (
                      <View key={item.key} style={{ marginLeft: item.depth * 12 }}>
                        <WorkspaceItem
                          active={
                            item.workspace !== undefined && item.workspace.sessionIds.includes(currentSessionId ?? '')
                          }
                          workspaceKey={item.key}
                          label={item.label}
                          collapsed={collapsedWorkspaceKeys.has(item.key)}
                          onPress={() => toggleWorkspace(item.key)}
                          onLongPress={
                            item.workspace === undefined
                              ? undefined
                              : () =>
                                  setExpandedWorkspaceId((current) =>
                                    current === item.workspace?.workspaceId ? undefined : item.workspace?.workspaceId,
                                  )
                          }
                        />
                        {item.workspace !== undefined && expandedWorkspaceId === item.workspace.workspaceId ? (
                          <View
                            accessible
                            accessibilityLabel={message('drawer.workspaceActions')}
                            style={styles.sessionActions}
                          >
                            <NativeListRow
                              title={message('drawer.renameWorkspace')}
                              accessibilityRole="button"
                              onPress={() =>
                                router.push({
                                  pathname: '/workspace/[workspaceId]/rename',
                                  params: {
                                    workspaceId: item.workspace?.workspaceId ?? '',
                                    title: item.workspace?.title ?? item.label,
                                  },
                                })
                              }
                              right={<NativeIcon name="edit-outline" size={18} color={theme.colors.inkMuted} />}
                            />
                            <NativeListRow
                              title={message('drawer.removeWorkspace')}
                              description={message('drawer.removeWorkspaceDetail')}
                              accessibilityRole="button"
                              onPress={() =>
                                confirmDeleteWorkspace(
                                  item.workspace?.workspaceId ?? '',
                                  item.workspace?.title ?? item.label,
                                )
                              }
                              right={<NativeIcon name="folder-close" size={18} color={theme.colors.danger} />}
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : item.kind === 'overflow' ? (
                      <Pressable
                        android_ripple={{ borderless: false }}
                        key={item.key}
                        accessibilityRole="button"
                        accessibilityLabel={
                          item.expanded
                            ? message('drawer.collapseSession')
                            : format('drawer.expandMore', { count: item.hiddenCount })
                        }
                        accessibilityState={{ expanded: item.expanded }}
                        onPress={() => toggleWorkspaceSessions(item.workspaceKey)}
                        style={({ pressed }) => [
                          styles.expandButton,
                          { marginLeft: item.depth * 12 },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.expandText}>
                          {item.expanded
                            ? message('drawer.collapse')
                            : format('drawer.expandMore', { count: item.hiddenCount })}
                        </Text>
                        <NativeIcon
                          name={item.expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                          size={18}
                          color={theme.colors.inkMuted}
                        />
                      </Pressable>
                    ) : (
                      <View key={item.key} style={{ marginLeft: item.depth * 12 }}>
                        <SessionItem
                          archived={archivedSessionIds.has(item.session.sessionId)}
                          pinned={pinnedSessionIds.has(item.session.sessionId)}
                          onTogglePin={() => void togglePin(item.session)}
                          onCopyId={() => void copySessionId(item.session)}
                          subagentsRunning={runningSubagents.get(item.session.sessionId) ?? 0}
                          onRestore={() => void restoreSession(item.session.sessionId)}
                          onMoveUp={orderBy === 'manual' ? () => moveSession(item.session.sessionId, -1) : undefined}
                          onMoveDown={orderBy === 'manual' ? () => moveSession(item.session.sessionId, 1) : undefined}
                          onArchive={() => void confirmArchive(item.session)}
                          onExport={() => void exportSession(item.session)}
                          onFork={() => void forkSession(item.session.sessionId)}
                          onRename={() =>
                            router.push({
                              pathname: '/session/[sessionId]/rename',
                              params: {
                                sessionId: item.session.sessionId,
                                title: item.session.title ?? message('session.untitled'),
                              },
                            })
                          }
                          session={item.session}
                          selected={item.session.sessionId === currentSessionId}
                          onPress={() => openSession(item.session.sessionId)}
                        />
                      </View>
                    ),
                  )
                )}
              </View>
            </View>
          </DrawerContentScrollView>
        </KeyboardAvoidingView>
        {optionsOpen ? (
          <DrawerViewMenu
            groupBy={groupBy}
            orderBy={orderBy}
            archivedFilter={archivedFilter}
            onClose={() => setOptionsOpen(false)}
            onGroupPick={(value) => updateView(scope, { groupBy: value })}
            onOrderPick={pickOrder}
            onFilterPick={(value) => updateView(scope, { archivedFilter: value })}
          />
        ) : null}
      </View>
      <ConfirmSheet
        open={confirm !== undefined}
        title={
          confirm?.kind === 'archive'
            ? message(confirm.activity === undefined ? 'drawer.archiveSession' : 'drawer.archiveStopTitle')
            : message('drawer.removeWorkspace')
        }
        body={
          confirm?.kind === 'archive'
            ? [
                format(confirm.activity === undefined ? 'drawer.archiveSessionBody' : 'drawer.archiveStopBody', {
                  title:
                    typeof confirm.session.title === 'string' && confirm.session.title.trim()
                      ? confirm.session.title
                      : message('drawer.newSession'),
                }),
                ...(confirm.activity === undefined ? [] : ['', ...confirm.activity.map((line) => `· ${line}`)]),
              ].join('\n')
            : confirm?.kind === 'deleteWorkspace'
              ? format('drawer.removeWorkspaceBody', { title: confirm.title })
              : ''
        }
        confirmLabel={
          confirm?.kind === 'archive'
            ? message(confirm.activity === undefined ? 'drawer.archive' : 'drawer.archiveStopAction')
            : message('drawer.remove')
        }
        onCancel={() => setConfirm(undefined)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(undefined)
          if (pending?.kind === 'archive') {
            warnFeedback()
            void archiveSession(pending.session.sessionId, pending.activity !== undefined)
          } else if (pending?.kind === 'deleteWorkspace') void deleteWorkspace(pending.workspaceId)
        }}
      />
    </SafeAreaView>
  )
}

/**
 * One sidebar destination as a compact chip.
 *
 * @param props - The glyph, the label, and where it navigates.
 * @returns The chip.
 */
function DrawerNavChip({
  icon,
  label,
  onPress,
}: {
  icon: 'plugin-pinwheel-outline' | 'clock-outline' | 'settings-outline'
  label: string
  onPress: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeSessionDrawerStyles)
  return (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.navChip, pressed && styles.pressed]}
    >
      <NativeIcon name={icon} size={16} color={theme.colors.ink} />
      <Text numberOfLines={1} style={styles.navChipLabel}>
        {label}
      </Text>
    </Pressable>
  )
}

function useDebouncedText(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs, value])
  return debounced
}

function currentSessionFromState(state: DrawerContentComponentProps['state']): string | undefined {
  return sessionIdFromRoute(state.routes[state.index])
}

function requireConnection(connection: ReturnType<typeof useConnectionStore.getState>['connection']) {
  if (!connection) throw new Error(message('drawer.connectFirstBody'))
  return connection
}
