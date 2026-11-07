import { MobileApi, MobileApiError } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { ConfirmSheet } from '@/components/confirm-sheet'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { ErrorNotice } from '@/components/session-screen-state'
import { withErrorContext } from '@/components/route-params'
import { WorkspaceShell } from '@/components/workspace-shell'
import { useScreenActive } from '@/hooks/use-screen-active'
import { format, t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileScheduleEntry } from '@/types/mobile'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { memo, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

/** Desktop-owned automation catalog; all visible controls invoke the corresponding schedule API. */
export default function SchedulesScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const active = useScreenActive()
  const connection = useConnectionStore((state) => state.connection)
  const client = useMemo(() => (connection ? new MobileApi(connection) : undefined), [connection])
  const cache = useQueryClient()
  const gate = useRef(false)
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
    <WorkspaceShell title={message('schedule.title')}>
      {!client ? (
        <Text style={s.empty}>{message('drawer.connectFirstBody')}</Text>
      ) : catalog.isPending ? (
        <ActivityIndicator color={theme.colors.inkMuted} />
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
          ListEmptyComponent={<Text style={s.empty}>{message('schedule.empty')}</Text>}
          renderItem={({ item: task }) => <ScheduleCard task={task} disabled={mutation.isPending} onUpdate={update} />}
        />
      )}
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
  return (
    <View style={s.card}>
      <View style={s.heading}>
        <NativeIcon name="clock-outline" color={theme.colors.inkTertiary} size={16} />
        <Text style={s.title}>{task.title}</Text>
        <Text style={s.status}>{message(`schedule.${task.status}`)}</Text>
      </View>
      <Text numberOfLines={4} style={s.prompt}>
        {task.prompt}
      </Text>
      <Text style={s.meta}>
        {format('schedule.next', {
          time: Number.isNaN(Date.parse(task.scheduledAt))
            ? task.scheduledAt
            : new Date(task.scheduledAt).toLocaleString(),
        })}
      </Text>
      <View style={s.actions}>
        {task.status !== 'ended' ? (
          <NativeActionButton
            label={message(task.status === 'active' ? 'schedule.pause' : 'schedule.resume')}
            icon={task.status === 'active' ? 'pause-outline' : 'play-outline'}
            variant="secondary"
            disabled={disabled}
            onPress={() => onUpdate(task, task.status === 'active' ? 'pause' : 'resume')}
          />
        ) : null}
        <NativeActionButton
          label={message('schedule.remove')}
          icon="trash-outline"
          variant="secondary"
          disabled={disabled}
          onPress={() => setConfirmingRemove(true)}
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
        {task.target.kind === 'session' ? (
          <Pressable
            android_ripple={{ borderless: false }}
            accessibilityRole="button"
            onPress={() => {
              if (task.target.kind === 'session')
                router.push({
                  pathname: '/session/[sessionId]',
                  params: { sessionId: task.target.sessionId },
                })
            }}
            style={s.open}
          >
            <Text style={s.link}>{message('schedule.openSession')}</Text>
          </Pressable>
        ) : null}
      </View>
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
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    empty: { color: theme.colors.inkMuted, padding: 24, fontSize: 14 },
    open: { minHeight: 44, justifyContent: 'center' },
    link: { color: theme.colors.accentText, fontSize: 13, lineHeight: 20 },
  })
