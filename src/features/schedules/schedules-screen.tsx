import { MobileApi, MobileApiError } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { ConfirmSheet } from '@/components/confirm-sheet'
import { NativeEmptyState } from '@/components/native-empty-state'
import { NativeRunningRing } from '@/components/native-running-ring'
import { ScheduleEditor } from '@/components/schedule-editor'
import { NativeMenuPanel } from '@/components/native-menu-panel'
import { NativeIcon } from '@/components/native-icon'
import { ErrorNotice } from '@/components/session-screen-state'
import { withErrorContext } from '@/components/route-params'
import { WorkspaceShell } from '@/components/workspace-shell'
import { useScreenActive } from '@/hooks/use-screen-active'
import { format, t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileScheduleCreateRequest, MobileScheduleEntry } from '@/types/mobile'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { memo, useMemo, useRef, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

/** Desktop-owned automation catalog; all visible controls invoke the corresponding schedule API. */
export default function SchedulesScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const active = useScreenActive()
  const connection = useConnectionStore((state) => state.connection)
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const cache = useQueryClient()
  const gate = useRef(false)
  const [creating, setCreating] = useState(false)
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
  const update = (task: MobileScheduleEntry, action: 'pause' | 'resume' | 'delete'): void => {
    if (gate.current) return
    gate.current = true
    void mutation
      .mutateAsync({ task, action })
      .catch(() => undefined)
      .finally(() => {
        gate.current = false
      })
  }
  return (
    <WorkspaceShell
      title={message('schedule.title')}
      rightAction={
        <Pressable
          accessibilityLabel={message('schedule.createTitle')}
          accessibilityRole="button"
          disabled={!client}
          hitSlop={8}
          onPress={() => setCreating(true)}
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
          data={catalog.data.items}
          keyExtractor={(task) => task.id}
          ListEmptyComponent={
            <NativeEmptyState
              action={{
                icon: 'plus-outline',
                label: message('schedule.createAction'),
                onPress: () => setCreating(true),
              }}
              description={message('schedule.emptyDetail')}
              icon="clock-outline"
              title={message('schedule.empty')}
            />
          }
          renderItem={({ item: task }) => <ScheduleCard task={task} disabled={mutation.isPending} onUpdate={update} />}
        />
      )}
      <ScheduleEditor
        onClose={() => setCreating(false)}
        onCreate={(request) => create.mutateAsync(request).then(() => undefined)}
        open={creating}
        pending={create.isPending}
        timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      />
    </WorkspaceShell>
  )
}

const ScheduleCard = memo(function ScheduleCard({
  task,
  disabled,
  onUpdate,
}: {
  task: MobileScheduleEntry
  disabled: boolean
  onUpdate: (task: MobileScheduleEntry, action: 'pause' | 'resume' | 'delete') => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // One `…` menu per task instead of three buttons: a list of automations should
  // read as a list, and only one row's actions are ever wanted at a time.
  const actions = [
    ...(task.status === 'ended'
      ? []
      : [
          {
            icon: (task.status === 'active' ? 'pause-outline' : 'play-outline') as 'pause-outline' | 'play-outline',
            label: message(task.status === 'active' ? 'schedule.pause' : 'schedule.resume'),
            onPress: () => onUpdate(task, task.status === 'active' ? 'pause' : 'resume'),
          },
        ]),
    ...(task.target.kind === 'session'
      ? [
          {
            icon: 'new-chat-outline' as const,
            label: message('schedule.openSession'),
            onPress: () =>
              router.push({
                pathname: '/session/[sessionId]',
                params: { sessionId: (task.target as { kind: 'session'; sessionId: string }).sessionId },
              }),
          },
        ]
      : []),
    { icon: 'trash-outline' as const, label: message('schedule.remove'), onPress: () => setConfirmingRemove(true) },
  ]
  return (
    <View style={s.card}>
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
          onPress={() => setMenuOpen((current) => !current)}
          style={({ pressed }) => [s.rowAction, pressed && s.pressed]}
        >
          <NativeIcon name="ellipsis-outline" size={14} color={theme.colors.inkMuted} />
        </Pressable>
      </View>
      <Text numberOfLines={2} style={s.prompt}>
        {task.prompt}
      </Text>
      <Text style={s.meta}>
        {format('schedule.next', {
          time: Number.isNaN(Date.parse(task.scheduledAt))
            ? task.scheduledAt
            : new Date(task.scheduledAt).toLocaleString(),
        })}
      </Text>
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
    </View>
  )
})

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    list: { padding: 16, gap: 12 },
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
    meta: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    headerAction: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 },
    loading: { alignItems: 'center', paddingVertical: 32 },
    rowAction: { alignItems: 'center', height: 28, justifyContent: 'center', width: 28 },
    pressed: { opacity: 0.62 },
  })
