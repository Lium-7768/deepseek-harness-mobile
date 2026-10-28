import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { DrawerContentScrollView, type DrawerContentComponentProps } from 'expo-router/drawer'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MobileApi } from '@/api/mobile-api'
import { NativeBrandMark } from '@/components/native-brand-mark'
import { NativeIcon } from '@/components/native-icon'
import { NativeListRow } from '@/components/native-list'
import {
  hasWorkspaceData,
  sessionDisplayTitle,
  sessionIdFromRoute,
  sessionRows,
  sessionTimeLabel,
  sortSessions,
  visibleWorkspaceRows,
  type SessionDrawerRow,
} from '@/components/session-drawer-logic'
import type { SessionSummary } from '@/types/mobile'
import { useConnectionStore } from '@/state/connection'
import { useSessionSelectionStore } from '@/state/session-selection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { format, t as message } from '@/locale'

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
export function SessionDrawer(props: DrawerContentComponentProps): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const { navigation, state } = props
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedText(search.trim(), 250)
  const [expandedViewSection, setExpandedViewSection] = useState<'group' | 'sort' | undefined>()
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [groupBy, setGroupBy] = useState<'workspace' | 'flat'>('workspace')
  const [collapsedWorkspaceKeys, setCollapsedWorkspaceKeys] = useState<Set<string>>(() => new Set())
  const [expandedWorkspaceSessionKeys, setExpandedWorkspaceSessionKeys] = useState<Set<string>>(() => new Set())
  const [expandedSessionId, setExpandedSessionId] = useState<string | undefined>()
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState<string | undefined>()
  const connection = useConnectionStore(value => value.connection)
  const selectSession = useSessionSelectionStore(value => value.selectSession)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['session-list', connection?.gatewayUrl, connection?.deviceId],
    enabled: Boolean(connection),
    queryFn: () => new MobileApi(requireConnection(connection)).listSessions(),
  })
  const contentSearch = useQuery({
    queryKey: ['session-search', connection?.gatewayUrl, connection?.deviceId, debouncedSearch],
    enabled: Boolean(connection) && debouncedSearch.length > 0,
    queryFn: () => new MobileApi(requireConnection(connection)).searchSessions(debouncedSearch),
  })
  const currentSessionId = currentSessionFromState(state)
  const archivedSessionIds = useMemo(
    () => new Set(query.data?.archivedSessionIds ?? []),
    [query.data?.archivedSessionIds],
  )
  const sessions = useMemo(
    () => (query.data?.items ?? []).filter(item => !archivedSessionIds.has(item.sessionId)),
    [archivedSessionIds, query.data?.items],
  )
  const workspaces = query.data?.workspaces ?? []
  const searchActive = search.trim().length > 0
  const sessionById = useMemo(() => new Map(sessions.map(item => [item.sessionId, item])), [sessions])
  const searchedSessions = useMemo(
    () =>
      (contentSearch.data?.items ?? []).flatMap((hit) => {
        const session = sessionById.get(hit.sessionId)
        return session === undefined ? [] : [{ ...session, searchSnippet: hit.snippet }]
      }),
    [contentSearch.data?.items, sessionById],
  )
  const filteredSessions = useMemo(
    () => sortSessions(searchActive ? searchedSessions : sessions, 'updated'),
    [searchActive, searchedSessions, sessions],
  )
  const workspaceDataAvailable = hasWorkspaceData(workspaces)
  const rows = useMemo<Exclude<SessionDrawerRow, { kind: 'overflow' }>[]>(
    () => sessionRows(filteredSessions, workspaces, searchActive ? 'flat' : groupBy, currentSessionId),
    [currentSessionId, groupBy, searchActive, filteredSessions, workspaces],
  )
  const visibleRows = useMemo(
    () => visibleWorkspaceRows(rows, collapsedWorkspaceKeys, expandedWorkspaceSessionKeys),
    [collapsedWorkspaceKeys, expandedWorkspaceSessionKeys, rows],
  )

  const closeDrawer = (): void => navigation.closeDrawer()
  const openSession = (sessionId: string): void => {
    closeDrawer()
    if (connection !== undefined) void selectSession(connection, sessionId)
    if (sessionId !== currentSessionId) router.push({ pathname: '/session/[sessionId]', params: { sessionId } })
  }
  const openSettings = (): void => {
    closeDrawer()
    if (state.routes[state.index]?.name !== 'settings') router.push('/settings')
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
      queryClient.invalidateQueries({ queryKey: ['session-list', connection?.gatewayUrl, connection?.deviceId] }),
    ])
  }
  const createSession = async (): Promise<void> => {
    try {
      const created = await new MobileApi(requireConnection(connection)).createSession()
      await refreshSessions()
      openSession(created.sessionId)
    } catch (error) {
      Alert.alert(message('drawer.newSessionFailedTitle'), error instanceof Error ? error.message : message('common.retry'))
    }
  }
  const forkSession = async (sessionId: string): Promise<void> => {
    try {
      const created = await new MobileApi(requireConnection(connection)).forkSession(sessionId)
      await refreshSessions()
      setExpandedSessionId(undefined)
      openSession(created.sessionId)
    } catch (error) {
      Alert.alert(message('drawer.forkFailedTitle'), error instanceof Error ? error.message : message('common.retry'))
    }
  }
  const archiveSession = async (sessionId: string): Promise<void> => {
    try {
      await new MobileApi(requireConnection(connection)).archiveSession(sessionId)
      await refreshSessions()
      setExpandedSessionId(undefined)
      if (sessionId === currentSessionId) router.replace('/workspace')
    } catch (error) {
      Alert.alert(message('drawer.archiveFailedTitle'), error instanceof Error ? error.message : message('common.retry'))
    }
  }
  const deleteWorkspace = async (workspaceId: string): Promise<void> => {
    try {
      await new MobileApi(requireConnection(connection)).deleteWorkspace(workspaceId)
      await refreshSessions()
      setExpandedWorkspaceId(undefined)
    } catch (error) {
      Alert.alert(message('drawer.removeWorkspaceFailedTitle'), error instanceof Error ? error.message : message('common.retry'))
    }
  }
  const confirmDeleteWorkspace = (workspaceId: string, title: string): void => {
    Alert.alert(message('drawer.removeWorkspace'), format('drawer.removeWorkspaceBody', { title }), [
      { text: message('common.cancel'), style: 'cancel' },
      { text: message('drawer.remove'), style: 'destructive', onPress: () => void deleteWorkspace(workspaceId) },
    ])
  }
  const confirmArchive = (session: SessionSummary): void => {
    const title = typeof session.title === 'string' && session.title.trim() ? session.title : message('drawer.newSession')
    Alert.alert(message('drawer.archiveSession'), format('drawer.archiveSessionBody', { title }), [
      { text: message('common.cancel'), style: 'cancel' },
      { text: message('drawer.archive'), style: 'destructive', onPress: () => void archiveSession(session.sessionId) },
    ])
  }

  return (
    <SafeAreaView edges={['top', 'left', 'bottom']} style={styles.drawerSafe}>
      <View style={styles.drawerFrame}>
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={styles.drawerContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              tintColor={theme.colors.accent}
              refreshing={query.isFetching}
              onRefresh={() => void query.refetch()}
            />
          }
          style={styles.drawerScroll}
        >
          <View style={styles.brandRow}>
            <View style={styles.brand}>
              <NativeBrandMark size={24} />
              <Text numberOfLines={1} style={styles.brandWord}>
                deepseek
              </Text>
              <Text style={styles.brandTag}>HARNESS</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={message('drawer.close')}
              hitSlop={8}
              onPress={closeDrawer}
              style={({ pressed }) => [styles.topIcon, pressed && styles.pressed]}
            >
              <NativeIcon name="close-outline" size={22} color={theme.colors.inkMuted} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={message('drawer.newSession')}
            disabled={!connection}
            onPress={() => void createSession()}
            style={({ pressed }) => [styles.newSession, !connection && styles.disabledAction, pressed && styles.pressed]}
          >
            <NativeIcon name="new-chat-outline" size={21} color={connection ? theme.colors.accent : theme.colors.inkFaint} />
            <View style={styles.newSessionTextWrap}>
              <Text style={connection ? styles.newSessionText : styles.newSessionTextDisabled}>{message('drawer.newSession')}</Text>
              <Text style={styles.newSessionHint}>{connection ? message('drawer.createOnDesktop') : message('drawer.connectFirst')}</Text>
            </View>
          </Pressable>

          <View style={styles.workspaceHeader}>
            <Text style={styles.workspaceTitle}>{groupBy === 'workspace' ? message('drawer.workspaces') : message('drawer.sessions')}</Text>
            <View style={styles.workspaceActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={message('drawer.searchSessions')}
                hitSlop={4}
                onPress={() => setSearchOpen(value => !value)}
                style={({ pressed }) => [styles.actionIcon, pressed && styles.pressed]}
              >
                <NativeIcon name="search-outline" size={21} color={theme.colors.inkMuted} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={optionsOpen ? message('drawer.collapseOptions') : message('drawer.expandOptions')}
                hitSlop={4}
                onPress={() => {
                  setOptionsOpen(value => !value)
                  setExpandedViewSection(undefined)
                }}
                style={({ pressed }) => [styles.actionIcon, pressed && styles.pressed]}
              >
                <NativeIcon name={optionsOpen ? 'chevron-up-outline' : 'sliders-two-outline'} size={21} color={theme.colors.inkMuted} />
              </Pressable>
              <View
                accessible
                accessibilityLabel={message('drawer.addWorkspaceDesktopOnly')}
                accessibilityState={{ disabled: true }}
                style={[styles.actionIcon, styles.disabledAction]}
              >
                <NativeIcon name="project-add-outline" size={21} color={theme.colors.inkFaint} />
              </View>
            </View>
          </View>

          {optionsOpen ? (
            <View accessible accessibilityLabel={message('drawer.viewSettings')} style={styles.compactOptions}>
              <NativeListRow
                title={message('drawer.groupBy')}
                description={groupBy === 'workspace' ? message('drawer.groupByWorkspace') : message('drawer.singleList')}
                accessibilityRole="button"
                onPress={() => setExpandedViewSection(value => (value === 'group' ? undefined : 'group'))}
                right={
                  <NativeIcon
                    name={expandedViewSection === 'group' ? 'chevron-up-outline' : 'chevron-right-outline'}
                    size={18}
                    color={theme.colors.inkMuted}
                  />
                }
              />
              {expandedViewSection === 'group' ? (
                <View style={styles.compactChoices}>
                  <OptionRow
                    label={workspaceDataAvailable ? message('drawer.groupByWorkspace') : message('drawer.groupByWorkspaceUngrouped')}
                    selected={groupBy === 'workspace'}
                    onPress={() => {
                      setGroupBy('workspace')
                      setExpandedViewSection(undefined)
                    }}
                  />
                  <OptionRow
                    label={message('drawer.singleList')}
                    selected={groupBy === 'flat'}
                    onPress={() => {
                      setGroupBy('flat')
                      setExpandedViewSection(undefined)
                    }}
                  />
                </View>
              ) : null}
              <View style={styles.optionDivider} />
              <NativeListRow
                title={message('drawer.sortBy')}
                description={message('drawer.recentlyUpdated')}
                accessibilityRole="button"
                onPress={() => setExpandedViewSection(value => (value === 'sort' ? undefined : 'sort'))}
                right={
                  <NativeIcon
                    name={expandedViewSection === 'sort' ? 'chevron-up-outline' : 'chevron-right-outline'}
                    size={18}
                    color={theme.colors.inkMuted}
                  />
                }
              />
              {expandedViewSection === 'sort' ? (
                <View style={styles.compactChoices}>
                  <OptionRow label={message('drawer.recentlyUpdated')} selected onPress={() => setExpandedViewSection(undefined)} />
                  <View
                    accessible
                    accessibilityLabel={message('drawer.manualOrderUnsupported')}
                    accessibilityState={{ disabled: true }}
                    style={styles.disabledOptionRow}
                  >
                    <Text style={styles.disabledOptionLabel}>{message('drawer.manualOrderUnsupported')}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
          {searchOpen ? (
            <View style={styles.searchBox}>
              <NativeIcon name="search-outline" size={18} color={theme.colors.inkMuted} />
              <TextInput
                accessibilityLabel={message('drawer.searchSessions')}
                autoFocus
                onChangeText={setSearch}
                placeholder={message('drawer.searchPlaceholder')}
                placeholderTextColor={theme.colors.inkFaint}
                maxLength={500}
                style={styles.searchInput}
                value={search}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={message('drawer.clearSearch')}
                hitSlop={4}
                onPress={() => setSearch('')}
                style={styles.clearSearch}
              >
                <NativeIcon name="close-outline" size={18} color={theme.colors.inkMuted} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.listArea}>
            <View style={styles.list}>
              {rows.length === 0 ? (
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
                visibleRows.map(item =>
                  item.kind === 'workspace' ? (
                    <View key={item.key}>
                      <WorkspaceItem
                        workspaceKey={item.key}
                        label={item.label}
                        collapsed={collapsedWorkspaceKeys.has(item.key)}
                        onPress={() => toggleWorkspace(item.key)}
                        onLongPress={
                          item.workspace === undefined
                            ? undefined
                            : () =>
                              setExpandedWorkspaceId(current =>
                                current === item.workspace?.workspaceId ? undefined : item.workspace?.workspaceId,
                              )
                        }
                      />
                      {item.workspace !== undefined && expandedWorkspaceId === item.workspace.workspaceId ? (
                        <View accessible accessibilityLabel={message('drawer.workspaceActions')} style={styles.sessionActions}>
                          <NativeListRow
                            title={message('drawer.renameWorkspace')}
                            accessibilityRole="button"
                            onPress={() =>
                              router.push({
                                pathname: '/workspace/[workspaceId]/rename',
                                params: { workspaceId: item.workspace?.workspaceId ?? '', title: item.workspace?.title ?? item.label },
                              })
                            }
                            right={<NativeIcon name="edit-outline" size={18} color={theme.colors.inkMuted} />}
                          />
                          <NativeListRow
                            title={message('drawer.removeWorkspace')}
                            description={message('drawer.removeWorkspaceDetail')}
                            accessibilityRole="button"
                            onPress={() => confirmDeleteWorkspace(item.workspace?.workspaceId ?? '', item.workspace?.title ?? item.label)}
                            right={<NativeIcon name="folder-close" size={18} color={theme.colors.danger} />}
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : item.kind === 'overflow' ? (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityLabel={item.expanded ? message('drawer.collapseSession') : format('drawer.expandMore', { count: item.hiddenCount })}
                      accessibilityState={{ expanded: item.expanded }}
                      onPress={() => toggleWorkspaceSessions(item.workspaceKey)}
                      style={({ pressed }) => [styles.expandButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.expandText}>{item.expanded ? message('drawer.collapse') : format('drawer.expandMore', { count: item.hiddenCount })}</Text>
                      <NativeIcon
                        name={item.expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={18}
                        color={theme.colors.inkMuted}
                      />
                    </Pressable>
                  ) : (
                    <View key={item.key}>
                      <SessionItem
                        session={item.session}
                        selected={item.session.sessionId === currentSessionId}
                        onPress={() => openSession(item.session.sessionId)}
                        onLongPress={() =>
                          setExpandedSessionId(current =>
                            current === item.session.sessionId ? undefined : item.session.sessionId,
                          )
                        }
                      />
                      {expandedSessionId === item.session.sessionId ? (
                        <View accessible accessibilityLabel={message('drawer.sessionActions')} style={styles.sessionActions}>
                          <NativeListRow
                            title={message('drawer.rename')}
                            accessibilityRole="button"
                            onPress={() =>
                              router.push({
                                pathname: '/session/[sessionId]/rename',
                                params: { sessionId: item.session.sessionId, title: item.session.title ?? message('session.untitled') },
                              })
                            }
                            right={<NativeIcon name="edit-outline" size={18} color={theme.colors.inkMuted} />}
                          />
                          <NativeListRow
                            title={message('drawer.forkSession')}
                            accessibilityRole="button"
                            onPress={() => void forkSession(item.session.sessionId)}
                            right={<NativeIcon name="branch-outline" size={18} color={theme.colors.inkMuted} />}
                          />
                          <NativeListRow
                            title={message('drawer.archiveSession')}
                            accessibilityRole="button"
                            onPress={() => confirmArchive(item.session)}
                            right={<NativeIcon name="folder-close" size={18} color={theme.colors.danger} />}
                          />
                        </View>
                      ) : null}
                    </View>
                  ),
                )
              )}
              {searchActive && contentSearch.data?.hasMore ? <Text style={styles.searchHint}>{message('drawer.searchTooManyResults')}</Text> : null}
            </View>
          </View>
        </DrawerContentScrollView>
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={message('drawer.openSettings')}
            onPress={openSettings}
            style={({ pressed }) => [styles.footerAction, pressed && styles.pressed]}
          >
            <NativeIcon name="settings-outline" size={14} color={theme.colors.ink} />
            <Text style={styles.footerActionText}>{message('settings.title')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

function WorkspaceItem({
  workspaceKey,
  label,
  collapsed,
  onPress,
  onLongPress,
}: {
  workspaceKey: string
  label: string
  collapsed: boolean
  onPress: () => void
  onLongPress?: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const ungrouped = workspaceKey === 'workspace:ungrouped'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${collapsed ? message('drawer.expand') : message('drawer.collapse')}${label}`}
      accessibilityState={{ expanded: !collapsed }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [styles.folder, pressed && styles.pressed]}
    >
      <NativeIcon name={collapsed ? 'chevron-right-outline' : 'chevron-down-outline'} size={18} color={theme.colors.inkMuted} />
      <NativeIcon
        name={collapsed ? 'folder-close' : 'folder-open'}
        size={20}
        color={ungrouped ? theme.colors.inkMuted : theme.colors.accent}
      />
      <Text numberOfLines={1} style={styles.folderText}>
        {label}
      </Text>
    </Pressable>
  )
}

function SessionItem({
  session,
  selected,
  onPress,
  onLongPress,
}: {
  session: SessionSummary
  selected: boolean
  onPress: () => void
  onLongPress: () => void
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const title = sessionDisplayTitle(session)
  const time = sessionTimeLabel(session)
  const snippet = typeof session.searchSnippet === 'string' ? session.searchSnippet : undefined
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={format('drawer.openSession', { title })}
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      hitSlop={{ top: 1, bottom: 1 }}
      style={({ pressed }) => [styles.session, selected && styles.selected, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={styles.sessionTitle}>
        {title}
      </Text>
      <Text numberOfLines={snippet === undefined ? 1 : 2} style={styles.sessionTime}>
        {snippet ?? time}
      </Text>
    </Pressable>
  )
}

function OptionRow({
  label,
  selected,
  disabled = false,
  onPress,
}: {
  label: string
  selected: boolean
  disabled?: boolean
  onPress?: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      hitSlop={{ top: 4, bottom: 4 }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionRow, disabled && styles.disabledOptionRow, pressed && styles.pressed]}
    >
      <Text style={disabled ? styles.disabledOptionLabel : styles.optionLabel}>{label}</Text>
      {selected ? <NativeIcon name="check-outline" size={17} color={theme.colors.accentText} /> : null}
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

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    drawerFrame: { backgroundColor: theme.colors.drawerBackground, flex: 1, position: 'relative' },
    drawerSafe: { backgroundColor: theme.colors.drawerBackground, flex: 1 },
    drawerScroll: { backgroundColor: theme.colors.drawerBackground },
    drawerContent: { flexGrow: 1, paddingBottom: 64, paddingTop: theme.spacing.xs },
    brandRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 60,
      justifyContent: 'space-between',
      paddingLeft: 4,
      paddingVertical: 8,
    },
    brand: { alignItems: 'center', flexDirection: 'row', gap: 6, minWidth: 0 },
    brandWord: { color: theme.colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -1 },
    brandTag: {
      backgroundColor: theme.colors.ink,
      borderRadius: theme.radius.xs,
      color: theme.colors.textOnAccent,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.8,
      paddingHorizontal: 5,
      paddingVertical: 3,
    },
    topIcon: {
      alignItems: 'center',
      height: theme.touch.iconButton,
      justifyContent: 'center',
      width: theme.touch.iconButton,
    },
    newSession: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: theme.radius.bubble,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      minHeight: theme.touch.controlHeight,
      marginBottom: 8,
    },
    newSessionTextWrap: { alignItems: 'center', gap: 1 },
    newSessionText: { color: theme.colors.ink, fontSize: 15, fontWeight: '600' },
    newSessionTextDisabled: { color: theme.colors.inkMuted, fontSize: 15, fontWeight: '600' },
    newSessionHint: { color: theme.colors.inkFaint, fontSize: 10 },
    workspaceHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    workspaceTitle: { color: theme.colors.inkMuted, fontSize: 14, lineHeight: 20 },
    workspaceActions: { flexDirection: 'row', gap: 4 },
    actionIcon: {
      alignItems: 'center',
      height: theme.touch.iconButton,
      justifyContent: 'center',
      width: theme.touch.iconButton,
    },
    clearSearch: {
      alignItems: 'center',
      height: theme.touch.iconButton,
      justifyContent: 'center',
      width: theme.touch.iconButton,
    },
    disabledAction: { opacity: 0.45 },
    searchBox: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderStrong,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      marginBottom: 4,
      paddingHorizontal: 8,
    },
    // A minimum, not a fixed height: a large Dynamic Type setting must grow the
    // field instead of clipping the query.
    searchInput: { color: theme.colors.ink, flex: 1, fontSize: 14, minHeight: 36 },
    listArea: { flexGrow: 1 },
    list: { flexGrow: 1, paddingBottom: 52 },
    folder: {
      alignItems: 'center',
      borderRadius: theme.radius.card,
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xxs,
      minHeight: theme.touch.minTarget,
      paddingHorizontal: theme.spacing.xs,
    },
    folderText: { color: theme.colors.ink, fontSize: theme.typography.bodyLarge, fontWeight: '500' },
    sessionActions: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.control,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: theme.spacing.xs,
      marginHorizontal: theme.spacing.sm,
      overflow: 'hidden',
    },
    session: {
      alignItems: 'center',
      borderRadius: theme.radius.card,
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginLeft: theme.spacing.md,
      minHeight: theme.touch.minTarget,
      paddingHorizontal: theme.spacing.md,
    },
    selected: { backgroundColor: theme.colors.surfaceActive },
    sessionTitle: { color: theme.colors.ink, flex: 1, fontSize: 14 },
    sessionTime: { color: theme.colors.inkMuted, fontSize: 11 },
    emptyState: { color: theme.colors.inkMuted, paddingHorizontal: 8, paddingVertical: 24, textAlign: 'center' },
    expandButton: { alignItems: 'center', flexDirection: 'row', gap: 2, paddingHorizontal: 12, paddingVertical: 12 },
    expandText: { color: theme.colors.inkMuted, fontSize: 13 },
    searchHint: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18, paddingHorizontal: 4, paddingVertical: 8 },
    optionsTitle: {
      color: theme.colors.inkMuted,
      fontSize: 11,
      fontWeight: '700',
      paddingHorizontal: 9,
      paddingTop: 5,
      paddingBottom: 3,
    },
    compactOptions: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: theme.spacing.sm,
      overflow: 'hidden',
    },
    compactChoices: {
      backgroundColor: theme.colors.surfaceMuted,
      gap: theme.spacing.xxs,
      paddingVertical: theme.spacing.xs,
    },
    optionDivider: { backgroundColor: theme.colors.border, height: StyleSheet.hairlineWidth },
    inlineOptions: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: theme.spacing.sm,
      overflow: 'hidden',
      paddingVertical: theme.spacing.xs,
    },
    inlineOptionSection: { gap: theme.spacing.xxs, paddingVertical: theme.spacing.xxs },
    optionRow: {
      alignItems: 'center',
      borderRadius: 7,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 36,
      paddingHorizontal: 9,
    },
    optionLabel: { color: theme.colors.ink, fontSize: 13 },
    disabledOptionRow: {
      alignItems: 'center',
      borderRadius: 7,
      flexDirection: 'row',
      minHeight: 36,
      paddingHorizontal: 9,
    },
    disabledOptionLabel: { color: theme.colors.inkFaint, fontSize: 13 },
    menuSeparator: { backgroundColor: theme.colors.border, height: StyleSheet.hairlineWidth, marginVertical: 6 },
    addWorkspace: {
      alignItems: 'center',
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 7,
      marginTop: 6,
      paddingHorizontal: 9,
      paddingTop: 10,
    },
    disabledWorkspaceText: { color: theme.colors.inkFaint, fontSize: 13, fontWeight: '600' },
    // DSH Pocket keeps a drawer action bar pinned to the bottom and draws each
    // action as a bordered pill (34pt tall, 12pt radius, 14pt glyph, 13pt label).
    // The bar keeps the drawer fill so it reads as part of the drawer.
    footer: {
      backgroundColor: theme.colors.drawerBackground,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      bottom: 0,
      flexDirection: 'row',
      gap: 8,
      left: 0,
      padding: 10,
      position: 'absolute',
      right: 0,
    },
    footerAction: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      // 44pt rather than Pocket's 34pt: a native control must stay at the
      // platform's minimum touch target.
      gap: 8,
      minHeight: theme.touch.minTarget,
      paddingHorizontal: 12,
    },
    footerActionText: { color: theme.colors.ink, fontSize: 13 },
    pressed: { opacity: 0.62 },
  })
