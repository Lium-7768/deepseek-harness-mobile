import { MobileApi, MobileApiError, mobileErrorMessage } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { ConfirmSheet } from '@/components/confirm-sheet'
import { NativeEmptyState } from '@/components/native-empty-state'
import { NativeRunningRing } from '@/components/native-running-ring'
import { ScheduleDetailModal } from '@/components/schedule-detail'
import { ScheduleEditor } from '@/components/schedule-editor'
import {
  SCHEDULE_RECOMMENDATIONS,
  filterSchedules,
  scheduleFrequencyLabel,
  scheduleNextRunLabel,
  type ScheduleStatusFilter,
} from '@/components/schedule-catalog-logic'
import { NativeMenuPanel } from '@/components/native-menu-panel'
import { NativeIcon } from '@/components/native-icon'
import { ErrorNotice } from '@/components/session-screen-state'
import { withErrorContext } from '@/components/route-params'
import { WorkspaceShell } from '@/components/workspace-shell'
import { useScreenActive } from '@/hooks/use-screen-active'
import { format, t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { showSnackbar } from '@/state/snackbar'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileScheduleCreateRequest, MobileScheduleEntry, MobileScheduleTiming } from '@/types/mobile'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

/** Desktop-owned automation catalog; all visible controls invoke the corresponding schedule API. */
export default function SchedulesScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const active = useScreenActive()
  const connection = useConnectionStore((state) => state.connection)
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const cache = useQueryClient()
  const gate = useRef(false)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const [creating, setCreating] = useState(false)
  const [createInitial, setCreateInitial] = useState<
    { title: string; prompt: string; timing?: MobileScheduleTiming } | undefined
  >()
  const [selectedTask, setSelectedTask] = useState<MobileScheduleEntry | undefined>()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>('active')
  const catalog = useQuery({
    queryKey: queryKeys.schedules(),
    enabled: !!client && active,
    queryFn: ({ signal }) => {
      if (!client) throw new Error(message('drawer.connectFirstBody'))
      return client.withSignal(signal).schedules()
    },
    refetchInterval: active ? 15000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  })
  const mutation = useMutation({
    mutationFn: ({ task, action }: { task: MobileScheduleEntry; action: 'pause' | 'resume' | 'delete' }) => {
      if (!client) throw new Error(message('drawer.connectFirstBody'))
      return client.updateSchedule(task, action)
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: queryKeys.schedules() }),
    onError: (error) => {
      if (error instanceof MobileApiError && ['schedule-conflict', 'schedule-not-found'].includes(error.kind))
        void cache.invalidateQueries({ queryKey: queryKeys.schedules() })
      Alert.alert(message('schedule.failed'), error instanceof Error ? error.message : message('common.retry'))
    },
  })
  const create = useMutation({
    mutationFn: (request: MobileScheduleCreateRequest) => {
      if (!client) throw new Error(message('drawer.connectFirstBody'))
      return client.createSchedule(request)
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: queryKeys.schedules() }),
  })
  const runNow = useMutation({
    mutationFn: (task: MobileScheduleEntry) => {
      if (!client) throw new Error(message('drawer.connectFirstBody'))
      return client.runSchedule(task.id)
    },
    onSuccess: () => {
      showSnackbar(message('schedule.runQueued'))
      void cache.invalidateQueries({ queryKey: queryKeys.schedules() })
    },
    onError: (error) => {
      Alert.alert(message('schedule.failed'), mobileErrorMessage(error, message('common.retry')))
    },
  })
  const mutateScheduleAsync = mutation.mutateAsync
  const runScheduleMutate = runNow.mutate
  const update = useCallback(
    (task: MobileScheduleEntry, action: 'pause' | 'resume' | 'delete'): void => {
      if (gate.current) return
      gate.current = true
      void mutateScheduleAsync({ task, action })
        .catch(() => undefined)
        .finally(() => {
          gate.current = false
        })
    },
    [mutateScheduleAsync],
  )
  const openDetail = useCallback((task: MobileScheduleEntry): void => setSelectedTask(task), [])
  const handleRunNow = useCallback((task: MobileScheduleEntry): void => runScheduleMutate(task), [runScheduleMutate])
  const cardDisabled = mutation.isPending || runNow.isPending
  const keyExtractor = useCallback((task: MobileScheduleEntry) => task.id, [])
  const renderScheduleItem = useCallback(
    ({ item: task }: { item: MobileScheduleEntry }) => (
      <ScheduleCard
        task={task}
        disabled={cardDisabled}
        onOpenDetail={openDetail}
        onRunNow={handleRunNow}
        onUpdate={update}
      />
    ),
    [cardDisabled, handleRunNow, openDetail, update],
  )
  const catalogItems = catalog.data?.items ?? []
  const visibleItems = filterSchedules(catalogItems, statusFilter, query)
  const showRecommendations =
    visibleItems.length === 0 && query.trim() === '' && (statusFilter === 'active' || statusFilter === 'all')
  return (
    <WorkspaceShell
      title={message('schedule.title')}
      rightAction={
        <Pressable
          accessibilityLabel={message('schedule.createTitle')}
          accessibilityRole="button"
          disabled={!client}
          hitSlop={8}
          onPress={() => {
            setCreateInitial(undefined)
            setCreating(true)
          }}
          style={({ pressed }) => [s.headerAction, pressed && s.pressed]}
        >
          <NativeIcon name="plus-outline" size={20} color={client ? theme.colors.ink : theme.colors.inkFaint} />
        </Pressable>
      }
    >
      {!client ? (
        <NativeEmptyState
          action={{ icon: 'link-outline', label: message('connect.title'), onPress: () => router.replace('/connect') }}
          description={message('drawer.connectFirstBody')}
          icon="link-off"
          title={message('schedule.needsConnection')}
        />
      ) : catalog.isPending ? (
        <View style={s.loading}>
          <NativeRunningRing size={20} />
        </View>
      ) : catalog.isError ? (
        <ErrorNotice
          text={
            catalog.error instanceof MobileApiError && catalog.error.kind === 'unsupported'
              ? message('schedule.unsupported')
              : withErrorContext(message('schedule.loadFailed'), catalog.error)
          }
          onRetry={() => void catalog.refetch()}
        />
      ) : (
        <FlatList
          contentContainerStyle={s.list}
          data={visibleItems}
          keyExtractor={keyExtractor}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={s.catalogControls}>
              <ScrollView
                contentContainerStyle={s.filters}
                horizontal
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
              >
                {(['active', 'paused', 'ended', 'all'] as const).map((status) => {
                  const selected = statusFilter === status
                  return (
                    <Pressable
                      accessibilityLabel={
                        status === 'active'
                          ? message('schedule.filterActive')
                          : status === 'paused'
                            ? message('schedule.filterPaused')
                            : status === 'ended'
                              ? message('schedule.filterEnded')
                              : message('schedule.filterAll')
                      }
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      hitSlop={{ top: 8, bottom: 8 }}
                      key={status}
                      onPress={() => setStatusFilter(status)}
                      style={({ pressed }) => [s.filter, selected && s.filterSelected, pressed && s.pressed]}
                    >
                      <Text style={[s.filterText, selected && s.filterTextSelected]}>
                        {status === 'active'
                          ? message('schedule.filterActive')
                          : status === 'paused'
                            ? message('schedule.filterPaused')
                            : status === 'ended'
                              ? message('schedule.filterEnded')
                              : message('schedule.filterAll')}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
              <View style={s.search}>
                <NativeIcon name="search-outline" size={16} color={theme.colors.inkTertiary} />
                <TextInput
                  accessibilityLabel={message('schedule.searchLabel')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setQuery}
                  placeholder={message('schedule.searchPlaceholder')}
                  placeholderTextColor={theme.colors.inkTertiary}
                  returnKeyType="search"
                  style={s.searchInput}
                  value={query}
                />
                {query === '' ? null : (
                  <Pressable
                    accessibilityLabel={message('schedule.clearSearch')}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setQuery('')}
                    style={s.clearSearch}
                  >
                    <NativeIcon name="close-outline" size={16} color={theme.colors.inkTertiary} />
                  </Pressable>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyStack}>
              {catalogItems.length === 0 || (query.trim() === '' && statusFilter !== 'all') ? (
                <NativeEmptyState
                  action={{
                    icon: 'plus-outline',
                    label: message('schedule.createAction'),
                    onPress: () => {
                      setCreateInitial(undefined)
                      setCreating(true)
                    },
                  }}
                  description={message('schedule.emptyDetail')}
                  icon="clock-outline"
                  title={message('schedule.empty')}
                />
              ) : (
                <View style={s.noMatches}>
                  <NativeIcon name="search-outline" size={26} color={theme.colors.inkTertiary} />
                  <Text style={s.noMatchesTitle}>{message('schedule.noMatches')}</Text>
                  <Text style={s.noMatchesDetail}>{message('schedule.noMatchesDetail')}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setQuery('')
                      setStatusFilter('all')
                    }}
                    style={({ pressed }) => [s.clearFilters, pressed && s.pressed]}
                  >
                    <Text style={s.clearFiltersText}>{message('schedule.clearFilters')}</Text>
                  </Pressable>
                </View>
              )}
              {showRecommendations ? (
                <View style={s.recommendSection}>
                  <Text style={s.recommendHeading}>{message('schedule.recommendHeading')}</Text>
                  {SCHEDULE_RECOMMENDATIONS.map((item) => (
                    <Pressable
                      android_ripple={{ borderless: false }}
                      accessibilityRole="button"
                      key={item.id}
                      onPress={() => {
                        setCreateInitial({
                          title: item.title,
                          prompt: item.prompt,
                          timing: item.timing(timeZone),
                        })
                        setCreating(true)
                      }}
                      style={({ pressed }) => [s.recommendCard, pressed && s.pressed]}
                    >
                      <View style={s.recommendHead}>
                        <Text style={s.recommendTitle}>{item.title}</Text>
                        <NativeIcon name="plus-outline" size={16} color={theme.colors.accent} />
                      </View>
                      <Text numberOfLines={2} style={s.recommendDesc}>
                        {item.description}
                      </Text>
                      <View style={s.recommendWhenRow}>
                        <NativeIcon name="clock-outline" size={13} color={theme.colors.inkTertiary} />
                        <Text style={s.recommendWhen}>{item.schedule}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          }
          renderItem={renderScheduleItem}
        />
      )}
      <ScheduleEditor
        initial={createInitial}
        onClose={() => {
          setCreating(false)
          setCreateInitial(undefined)
        }}
        onCreate={(request) => create.mutateAsync(request).then(() => undefined)}
        open={creating}
        pending={create.isPending}
        timeZone={timeZone}
      />
      <ScheduleDetailModal api={client} initialTask={selectedTask} onClose={() => setSelectedTask(undefined)} />
    </WorkspaceShell>
  )
}

const ScheduleCard = memo(function ScheduleCard({
  task,
  disabled,
  onOpenDetail,
  onRunNow,
  onUpdate,
}: {
  task: MobileScheduleEntry
  disabled: boolean
  onOpenDetail: (task: MobileScheduleEntry) => void
  onRunNow: (task: MobileScheduleEntry) => void
  onUpdate: (task: MobileScheduleEntry, action: 'pause' | 'resume' | 'delete') => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [confirmingRun, setConfirmingRun] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const frequency = scheduleFrequencyLabel(task)
  const nextRun = scheduleNextRunLabel(task)
  // One `…` menu per task instead of three buttons: a list of automations should
  // read as a list, and only one row's actions are ever wanted at a time.
  const actions = [
    { icon: 'edit-outline' as const, label: message('schedule.viewDetail'), onPress: () => onOpenDetail(task) },
    { icon: 'paper-plane-outline' as const, label: message('schedule.runNow'), onPress: () => setConfirmingRun(true) },
    ...(task.status === 'ended'
      ? []
      : [
          {
            icon: (task.status === 'active' ? 'pause-outline' : 'play-outline') as 'pause-outline' | 'play-outline',
            label: message(task.status === 'active' ? 'schedule.pause' : 'schedule.resume'),
            onPress: () => onUpdate(task, task.status === 'active' ? 'pause' : 'resume'),
          },
        ]),
    ...(task.target.kind === 'session' || task.target.kind === 'new_once'
      ? [
          {
            icon: 'new-chat-outline' as const,
            label: message('schedule.openSession'),
            onPress: () =>
              router.push({
                pathname: '/session/[sessionId]',
                params: { sessionId: (task.target as { kind: 'session' | 'new_once'; sessionId: string }).sessionId },
              }),
          },
        ]
      : []),
    { icon: 'trash-outline' as const, label: message('schedule.remove'), onPress: () => setConfirmingRemove(true) },
  ]
  return (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={task.title}
      onPress={() => onOpenDetail(task)}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
    >
      <View style={s.heading}>
        <Text numberOfLines={1} style={s.title}>
          {task.title}
        </Text>
        <Text style={s.status}>{message(`schedule.${task.status}`)}</Text>
        <Pressable
          android_ripple={{ borderless: false }}
          accessibilityLabel={format('schedule.actionsFor', { title: task.title })}
          accessibilityRole="button"
          accessibilityState={{ disabled, expanded: menuOpen }}
          disabled={disabled}
          hitSlop={8}
          onPress={(event) => {
            event?.stopPropagation()
            setMenuOpen((current) => !current)
          }}
          style={({ pressed }) => [s.rowAction, pressed && s.pressed]}
        >
          <NativeIcon name="ellipsis-outline" size={14} color={theme.colors.inkMuted} />
        </Pressable>
      </View>
      <Text numberOfLines={2} style={s.prompt}>
        {task.prompt}
      </Text>
      <View style={s.metaRow}>
        {frequency ? <Text style={s.meta}>{frequency}</Text> : null}
        {nextRun ? <Text style={s.meta}>{nextRun}</Text> : null}
      </View>
      <NativeMenuPanel
        actionMenu
        groups={[
          { options: actions.map((action) => ({ icon: action.icon, label: action.label, value: action.label })) },
        ]}
        onClose={() => setMenuOpen(false)}
        onSelect={(value) => {
          setMenuOpen(false)
          actions.find((action) => action.label === value)?.onPress()
        }}
        open={menuOpen}
        title={task.title}
      />
      <ConfirmSheet
        open={confirmingRun}
        title={message('schedule.runConfirmTitle')}
        body={format('schedule.runConfirmBody', { title: task.title })}
        confirmLabel={message('schedule.runNow')}
        onCancel={() => setConfirmingRun(false)}
        onConfirm={() => {
          setConfirmingRun(false)
          onRunNow(task)
        }}
      />
      <ConfirmSheet
        open={confirmingRemove}
        title={message('schedule.remove')}
        body={format('schedule.removeBody', { title: task.title })}
        confirmLabel={message('schedule.remove')}
        onCancel={() => setConfirmingRemove(false)}
        onConfirm={() => {
          setConfirmingRemove(false)
          onUpdate(task, 'delete')
        }}
      />
    </Pressable>
  )
})

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    list: { padding: 16, gap: 12 },
    catalogControls: { gap: 10, paddingBottom: 4 },
    search: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 8,
      minHeight: 44,
      paddingHorizontal: 12,
    },
    searchInput: { color: theme.colors.ink, flex: 1, fontSize: 16, minHeight: 44, paddingVertical: 8 },
    clearSearch: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 },
    // `TaskManagerPage .filterTabs` / `.filterTab`: 28pt height, 8pt radius,
    // transparent at rest with tertiary text, hover fill + primary text when active.
    // `hitSlop` on the Pressable keeps the 44pt native touch target.
    filters: { flexDirection: 'row', gap: 8, paddingRight: 4 },
    filter: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: theme.radius.sm,
      justifyContent: 'center',
      minHeight: 28,
      paddingHorizontal: 10,
    },
    filterSelected: { backgroundColor: theme.colors.interactiveHover },
    filterText: { color: theme.colors.inkTertiary, fontSize: 14, lineHeight: 22 },
    filterTextSelected: { color: theme.colors.ink },
    noMatches: { alignItems: 'center', gap: 8, justifyContent: 'center', padding: 24 },
    noMatchesTitle: { color: theme.colors.ink, fontSize: 15, fontWeight: '500', lineHeight: 22, textAlign: 'center' },
    noMatchesDetail: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
    clearFilters: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      justifyContent: 'center',
      marginTop: 6,
      minHeight: 44,
      paddingHorizontal: 16,
    },
    clearFiltersText: { color: theme.colors.ink, fontSize: 14, lineHeight: 20 },
    card: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.radius.md,
      padding: 16,
      gap: 10,
    },
    heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    title: { color: theme.colors.ink, fontSize: 14, lineHeight: 22, flexGrow: 1, flexShrink: 1 },
    status: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    prompt: { color: theme.colors.inkMuted, fontSize: 14, lineHeight: 22 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    meta: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    emptyStack: { gap: 16 },
    recommendSection: { gap: 10, paddingTop: 4 },
    recommendHeading: { color: theme.colors.inkTertiary, fontSize: 12, fontWeight: '500', lineHeight: 18 },
    recommendCard: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 6,
      padding: 14,
    },
    recommendHead: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
    recommendTitle: { color: theme.colors.ink, flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },
    recommendDesc: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 19 },
    recommendWhenRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
    recommendWhen: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    headerAction: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 },
    loading: { alignItems: 'center', paddingVertical: 32 },
    rowAction: { alignItems: 'center', height: 28, justifyContent: 'center', width: 28 },
    pressed: { opacity: 0.62 },
  })
