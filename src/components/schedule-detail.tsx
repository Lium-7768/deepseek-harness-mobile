import { MobileApi, MobileApiError, mobileErrorMessage } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { ConfirmSheet } from '@/components/confirm-sheet'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { NativeMenuPanel } from '@/components/native-menu-panel'
import { NativeRunningRing } from '@/components/native-running-ring'
import { scheduleFrequencyLabel, scheduleNextRunLabel, scheduleTargetLabel } from '@/components/schedule-catalog-logic'
import { formFromScheduleEntry, timingOf, WEEKDAY_LABELS, type TimingKind } from '@/components/schedule-editor-logic'
import { ErrorNotice } from '@/components/session-screen-state'
import { workspaceKeyboardVerticalOffset } from '@/components/workspace-shell-logic'
import { format, t as message } from '@/locale'
import { showSnackbar } from '@/state/snackbar'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import type {
  MobileScheduleDeliveryRecord,
  MobileScheduleEntry,
  MobileScheduleHistoryPage,
  MobileSchedulePatch,
} from '@/types/mobile'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const KIND_LABELS = {
  after: 'schedule.timingAfter',
  at: 'schedule.timingAt',
  cron: 'schedule.timingCron',
  daily: 'schedule.timingDaily',
  every: 'schedule.timingEvery',
  rrule: 'schedule.timingRrule',
  weekly: 'schedule.timingWeekly',
} as const satisfies Record<TimingKind, string>

export type ScheduleDetailTab = 'rule' | 'records'

/**
 * Full-screen task detail modal matching desktop `TaskDetail` + `DeliveryHistory`:
 * exposes rule viewing/editing with `updatedAt` CAS, run-now with confirmation,
 * pause/resume/delete, target-session navigation, and paginated delivery records.
 */
export function ScheduleDetailModal({
  api,
  initialTask,
  onClose,
}: {
  api: MobileApi | undefined
  initialTask: MobileScheduleEntry | undefined
  onClose: () => void
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const cache = useQueryClient()
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const taskId = initialTask?.id

  const [tab, setTab] = useState<ScheduleDetailTab>('rule')
  const [confirmRun, setConfirmRun] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; text: string; conflict?: boolean } | undefined>()

  const detail = useQuery({
    queryKey: queryKeys.scheduleDetail(taskId),
    enabled: Boolean(api && taskId),
    queryFn: ({ signal }) => {
      if (!api || !taskId) throw new Error(message('drawer.connectFirstBody'))
      return api.withSignal(signal).viewSchedule(taskId)
    },
    initialData: initialTask,
    retry: false,
  })

  const task = detail.data ?? initialTask
  const hydratedVersion = useRef<string | undefined>(undefined)

  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [kind, setKind] = useState<TimingKind>('daily')
  const [time, setTime] = useState('09:00')
  const [hours, setHours] = useState('6')
  const [minutes, setMinutes] = useState('30')
  const [date, setDate] = useState('')
  const [weekdays, setWeekdays] = useState<readonly number[]>([1])
  const [cron, setCron] = useState('0 9 * * *')
  const [rrule, setRrule] = useState('FREQ=DAILY')

  const applyTaskToForm = (source: MobileScheduleEntry): void => {
    const form = formFromScheduleEntry(source, timeZone)
    setTitle(source.title)
    setPrompt(source.prompt)
    setKind(form.kind)
    setTime(form.time)
    setHours(form.hours)
    setMinutes(form.minutes)
    setDate(form.date)
    setWeekdays(form.weekdays)
    setCron(form.cron)
    setRrule(form.rrule)
    hydratedVersion.current = `${source.id}:${source.updatedAt ?? source.scheduledAt}`
  }

  useEffect(() => {
    if (!task) {
      hydratedVersion.current = undefined
      return
    }
    const versionKey = `${task.id}:${task.updatedAt ?? task.scheduledAt}`
    if (hydratedVersion.current === undefined || hydratedVersion.current.split(':')[0] !== task.id) {
      setTab('rule')
      setNotice(undefined)
      applyTaskToForm(task)
    } else if (hydratedVersion.current !== versionKey && !dirtyRef.current) {
      applyTaskToForm(task)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, task?.updatedAt, task?.scheduledAt])

  const initialForm = useMemo(
    () => (task ? formFromScheduleEntry(task, timeZone) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task?.id, task?.updatedAt, task?.kind, task?.scheduledAt, timeZone],
  )
  const currentTiming = timingOf({ cron, date, hours, kind, minutes, rrule, time, timeZone, weekdays })
  const initialTiming = initialForm ? timingOf(initialForm) : undefined
  const dirty = Boolean(
    task &&
    (title.trim() !== task.title ||
      prompt.trim() !== task.prompt ||
      (initialTiming !== undefined && JSON.stringify(currentTiming) !== JSON.stringify(initialTiming))),
  )
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty

  const history = useInfiniteQuery<MobileScheduleHistoryPage>({
    queryKey: queryKeys.scheduleHistory(taskId),
    enabled: Boolean(api && taskId && tab === 'records'),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => {
      if (!api || !taskId) throw new Error(message('drawer.connectFirstBody'))
      return api.withSignal(signal).scheduleHistory(taskId, {
        limit: 20,
        ...(typeof pageParam === 'string' ? { before: pageParam } : {}),
      })
    },
    getNextPageParam: (lastPage) => lastPage.nextBefore,
    retry: false,
  })

  const invalidateAll = async (): Promise<void> => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: queryKeys.schedules() }),
      cache.invalidateQueries({ queryKey: queryKeys.scheduleDetail(taskId) }),
      cache.invalidateQueries({ queryKey: queryKeys.scheduleHistory(taskId) }),
    ])
  }

  const editMutation = useMutation({
    mutationFn: (patch: MobileSchedulePatch) => {
      if (!api || !task) throw new Error(message('drawer.connectFirstBody'))
      return api.editSchedule(task.id, patch, task.updatedAt ?? null)
    },
    onSuccess: async (updated) => {
      applyTaskToForm(updated)
      setNotice({ tone: 'info', text: message('schedule.detailSaved') })
      showSnackbar(message('schedule.detailSaved'))
      await invalidateAll()
    },
    onError: (error) => {
      const conflict = error instanceof MobileApiError && error.kind === 'schedule-conflict'
      if (conflict || (error instanceof MobileApiError && error.kind === 'schedule-not-found')) {
        void invalidateAll()
      }
      setNotice({
        tone: 'error',
        text: mobileErrorMessage(error, message('schedule.failed')),
        conflict,
      })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (action: 'pause' | 'resume' | 'delete') => {
      if (!api || !task) throw new Error(message('drawer.connectFirstBody'))
      return api.updateSchedule(task, action)
    },
    onSuccess: async (_value, action) => {
      await invalidateAll()
      if (action === 'delete') {
        onClose()
      }
    },
    onError: (error) => {
      if (error instanceof MobileApiError && ['schedule-conflict', 'schedule-not-found'].includes(error.kind)) {
        void invalidateAll()
      }
      setNotice({ tone: 'error', text: mobileErrorMessage(error, message('schedule.failed')) })
    },
  })

  const runMutation = useMutation({
    mutationFn: () => {
      if (!api || !task) throw new Error(message('drawer.connectFirstBody'))
      return api.runSchedule(task.id)
    },
    onSuccess: async () => {
      setNotice({ tone: 'info', text: message('schedule.runQueued') })
      showSnackbar(message('schedule.runQueued'))
      await invalidateAll()
    },
    onError: (error) => {
      setNotice({ tone: 'error', text: mobileErrorMessage(error, message('schedule.failed')) })
    },
  })

  if (task === undefined) return null

  const busy = editMutation.isPending || toggleMutation.isPending || runMutation.isPending
  const frequency = scheduleFrequencyLabel(task)
  const nextRun = scheduleNextRunLabel(task)
  const floorMs = task.deliveryFloorEndsAt === undefined ? undefined : Date.parse(task.deliveryFloorEndsAt)
  const floorBlocked = floorMs !== undefined && !Number.isNaN(floorMs) && floorMs > Date.now()
  const runDisabled = busy || dirty || task.executionActive === true || floorBlocked
  const targetSessionId =
    task.target.kind === 'session' || task.target.kind === 'new_once' ? task.target.sessionId : undefined

  const saveEdit = (): void => {
    if (busy) return
    if (title.trim() === '' || prompt.trim() === '') {
      setNotice({ tone: 'error', text: message('schedule.detailInvalidTitle') })
      return
    }
    if (currentTiming === undefined) {
      setNotice({ tone: 'error', text: message('schedule.invalidTiming') })
      return
    }
    const patch: MobileSchedulePatch = {}
    if (title.trim() !== task.title) patch.title = title.trim()
    if (prompt.trim() !== task.prompt) patch.prompt = prompt.trim()
    if (initialTiming === undefined || JSON.stringify(currentTiming) !== JSON.stringify(initialTiming)) {
      patch.timing = currentTiming
    }
    if (Object.keys(patch).length === 0) return
    setNotice(undefined)
    editMutation.mutate(patch)
  }

  const records = history.data?.pages.flatMap((page) => page.records) ?? []
  const latestPage = history.data?.pages.at(-1)

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <SafeAreaView edges={['top', 'bottom']} style={s.safe}>
        <View style={s.header}>
          <Pressable
            accessibilityLabel={message('schedule.detailClose')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [s.headerIcon, pressed && s.pressed]}
          >
            <NativeIcon name="close-outline" size={20} color={theme.colors.ink} />
          </Pressable>
          <Text numberOfLines={1} style={s.headerTitle}>
            {task.title || message('schedule.detailTitle')}
          </Text>
          <View style={s.headerActions}>
            {task.status !== 'ended' ? (
              <Pressable
                accessibilityLabel={message(task.status === 'active' ? 'schedule.pause' : 'schedule.resume')}
                accessibilityRole="button"
                disabled={busy || dirty}
                hitSlop={8}
                onPress={() => toggleMutation.mutate(task.status === 'active' ? 'pause' : 'resume')}
                style={({ pressed }) => [s.headerIcon, (busy || dirty) && s.disabled, pressed && s.pressed]}
              >
                <NativeIcon
                  name={task.status === 'active' ? 'pause-outline' : 'play-outline'}
                  size={18}
                  color={theme.colors.ink}
                />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={message('schedule.runNow')}
              accessibilityRole="button"
              disabled={runDisabled}
              hitSlop={8}
              onPress={() => setConfirmRun(true)}
              style={({ pressed }) => [s.headerIcon, runDisabled && s.disabled, pressed && s.pressed]}
            >
              <NativeIcon name="paper-plane-outline" size={18} color={theme.colors.ink} />
            </Pressable>
            <Pressable
              accessibilityLabel={message('schedule.remove')}
              accessibilityRole="button"
              disabled={busy}
              hitSlop={8}
              onPress={() => setConfirmDelete(true)}
              style={({ pressed }) => [s.headerIcon, busy && s.disabled, pressed && s.pressed]}
            >
              <NativeIcon name="trash-outline" size={18} color={theme.colors.danger} />
            </Pressable>
          </View>
        </View>

        <View style={s.tabs} accessibilityRole="tablist">
          {(['rule', 'records'] as const).map((item) => {
            const selected = tab === item
            return (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setTab(item)}
                style={[s.tab, selected && s.tabSelected]}
              >
                <Text style={[s.tabText, selected && s.tabTextSelected]}>
                  {message(item === 'rule' ? 'schedule.detailTabRule' : 'schedule.detailTabRecords')}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={workspaceKeyboardVerticalOffset(insets.top, false)}
          style={s.flex}
        >
          {tab === 'rule' ? (
            <ScrollView
              contentContainerStyle={s.body}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              {notice ? (
                <View style={[s.banner, notice.tone === 'error' ? s.bannerError : s.bannerInfo]}>
                  <Text style={notice.tone === 'error' ? s.bannerErrorText : s.bannerInfoText}>{notice.text}</Text>
                  {notice.conflict ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setNotice(undefined)
                        void detail.refetch().then((res) => {
                          if (res.data) applyTaskToForm(res.data)
                        })
                      }}
                    >
                      <Text style={s.reloadLink}>{message('schedule.detailReload')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <View style={s.summaryCard}>
                <View style={s.summaryRow}>
                  <Text style={s.statusPill}>{message(`schedule.${task.status}`)}</Text>
                  {frequency ? <Text style={s.summaryMeta}>{frequency}</Text> : null}
                </View>
                {nextRun ? <Text style={s.summaryDetail}>{nextRun}</Text> : null}
                {floorBlocked ? <Text style={s.summaryDetail}>{message('schedule.runUnavailableFloor')}</Text> : null}
                <View style={s.targetRow}>
                  <Text style={s.targetLabel}>{scheduleTargetLabel(task.target)}</Text>
                  {targetSessionId ? (
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => {
                        onClose()
                        router.push({ pathname: '/session/[sessionId]', params: { sessionId: targetSessionId } })
                      }}
                      style={({ pressed }) => [s.openSessionBtn, pressed && s.pressed]}
                    >
                      <NativeIcon name="new-chat-outline" size={14} color={theme.colors.accent} />
                      <Text style={s.openSessionText}>{message('schedule.openSession')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <Text style={s.fieldLabel}>{message('schedule.fieldTitle')}</Text>
              <TextInput
                accessibilityLabel={message('schedule.fieldTitle')}
                editable={!busy}
                maxLength={120}
                onChangeText={setTitle}
                placeholder={message('schedule.fieldTitlePlaceholder')}
                placeholderTextColor={theme.colors.inkTertiary}
                selectionColor={theme.colors.accent}
                style={s.input}
                value={title}
              />

              <Text style={s.fieldLabel}>{message('schedule.fieldPrompt')}</Text>
              <TextInput
                accessibilityLabel={message('schedule.fieldPrompt')}
                editable={!busy}
                multiline
                onChangeText={setPrompt}
                placeholder={message('schedule.fieldPromptPlaceholder')}
                placeholderTextColor={theme.colors.inkTertiary}
                selectionColor={theme.colors.accent}
                style={[s.input, s.multiline]}
                value={prompt}
              />

              <Text style={s.fieldLabel}>{message('schedule.fieldTiming')}</Text>
              <Pressable
                accessibilityLabel={message('schedule.fieldTiming')}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [s.select, pressed && s.pressed]}
              >
                <Text style={s.selectText}>{message(KIND_LABELS[kind])}</Text>
                <NativeIcon name="chevron-down-outline" size={16} color={theme.colors.inkMuted} />
              </Pressable>

              {kind === 'daily' ? (
                <TextInput
                  accessibilityLabel={message('schedule.fieldTime')}
                  autoCapitalize="none"
                  editable={!busy}
                  onChangeText={setTime}
                  placeholder="09:00"
                  placeholderTextColor={theme.colors.inkTertiary}
                  selectionColor={theme.colors.accent}
                  style={s.input}
                  value={time}
                />
              ) : null}
              {kind === 'every' ? (
                <TextInput
                  accessibilityLabel={message('schedule.fieldHours')}
                  editable={!busy}
                  keyboardType="number-pad"
                  onChangeText={setHours}
                  selectionColor={theme.colors.accent}
                  style={s.input}
                  value={hours}
                />
              ) : null}
              {kind === 'at' ? (
                <TextInput
                  accessibilityLabel={message('schedule.fieldDate')}
                  autoCapitalize="none"
                  editable={!busy}
                  onChangeText={setDate}
                  placeholder="2026-11-11"
                  placeholderTextColor={theme.colors.inkTertiary}
                  selectionColor={theme.colors.accent}
                  style={s.input}
                  value={date}
                />
              ) : null}
              {kind === 'at' || kind === 'weekly' ? (
                <TextInput
                  accessibilityLabel={message('schedule.fieldTime')}
                  autoCapitalize="none"
                  editable={!busy}
                  onChangeText={setTime}
                  placeholder="09:00"
                  placeholderTextColor={theme.colors.inkTertiary}
                  selectionColor={theme.colors.accent}
                  style={s.input}
                  value={time}
                />
              ) : null}
              {kind === 'weekly' ? (
                <View style={s.weekdays}>
                  {WEEKDAY_LABELS.map((day) => {
                    const on = weekdays.includes(day.iso)
                    return (
                      <Pressable
                        accessibilityLabel={format('schedule.weekdayLabel', { day: day.label })}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        disabled={busy}
                        key={day.iso}
                        onPress={() =>
                          setWeekdays((current) =>
                            on ? current.filter((iso) => iso !== day.iso) : [...current, day.iso].sort((a, b) => a - b),
                          )
                        }
                        style={({ pressed }) => [s.weekday, on && s.weekdayOn, pressed && s.pressed]}
                      >
                        <Text style={[s.weekdayText, on && s.weekdayTextOn]}>{day.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              ) : null}
              {kind === 'cron' ? (
                <TextInput
                  accessibilityLabel={message('schedule.fieldCron')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  onChangeText={setCron}
                  placeholder="0 9 * * *"
                  placeholderTextColor={theme.colors.inkTertiary}
                  selectionColor={theme.colors.accent}
                  style={[s.input, s.mono]}
                  value={cron}
                />
              ) : null}
              {kind === 'rrule' ? (
                <TextInput
                  accessibilityLabel={message('schedule.fieldRrule')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  multiline
                  onChangeText={setRrule}
                  placeholder="FREQ=WEEKLY;BYDAY=MO"
                  placeholderTextColor={theme.colors.inkTertiary}
                  selectionColor={theme.colors.accent}
                  style={[s.input, s.mono, s.multiline]}
                  value={rrule}
                />
              ) : null}
              {kind === 'after' ? (
                <TextInput
                  accessibilityLabel={message('schedule.fieldMinutes')}
                  editable={!busy}
                  keyboardType="number-pad"
                  onChangeText={setMinutes}
                  selectionColor={theme.colors.accent}
                  style={s.input}
                  value={minutes}
                />
              ) : null}

              {dirty ? (
                <View style={s.editActions}>
                  <NativeActionButton
                    disabled={busy}
                    icon="close-outline"
                    label={message('schedule.detailDiscard')}
                    onPress={() => {
                      setNotice(undefined)
                      applyTaskToForm(task)
                    }}
                    variant="secondary"
                  />
                  <NativeActionButton
                    disabled={busy}
                    icon="check-outline"
                    label={editMutation.isPending ? message('schedule.detailSaving') : message('schedule.detailSave')}
                    loading={editMutation.isPending}
                    onPress={saveEdit}
                  />
                </View>
              ) : null}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={s.body}>
              {history.isPending ? (
                <View style={s.center}>
                  <NativeRunningRing size={20} />
                  <Text style={s.muted}>{message('schedule.deliveryLoading')}</Text>
                </View>
              ) : history.isError ? (
                <ErrorNotice
                  text={mobileErrorMessage(history.error, message('schedule.deliveryError'))}
                  onRetry={() => void history.refetch()}
                />
              ) : records.length === 0 ? (
                <View style={s.center}>
                  <NativeIcon name="clock-outline" size={24} color={theme.colors.inkTertiary} />
                  <Text style={s.muted}>{message('schedule.deliveryEmpty')}</Text>
                </View>
              ) : (
                <>
                  {latestPage?.earlierRecordsPruned ? (
                    <Text style={s.retentionNote}>
                      {format('schedule.deliveryPruned', {
                        days: latestPage.retention.days,
                        records: latestPage.retention.records,
                      })}
                    </Text>
                  ) : latestPage?.earlierRecordsUnavailable ? (
                    <Text style={s.retentionNote}>{message('schedule.deliveryUnavailable')}</Text>
                  ) : null}
                  {records.map((record) => (
                    <DeliveryRecordCard
                      key={record.messageId}
                      onOpenSession={() => {
                        onClose()
                        router.push({ pathname: '/session/[sessionId]', params: { sessionId: record.targetSessionId } })
                      }}
                      record={record}
                    />
                  ))}
                  {history.hasNextPage ? (
                    <NativeActionButton
                      disabled={history.isFetchingNextPage}
                      icon="chevron-down-outline"
                      label={message('schedule.deliveryLoadMore')}
                      loading={history.isFetchingNextPage}
                      onPress={() => void history.fetchNextPage()}
                      variant="secondary"
                    />
                  ) : null}
                </>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        <NativeMenuPanel
          groups={[
            {
              options: (['after', 'at', 'every', 'daily', 'weekly', 'cron', 'rrule'] as const).map((value) => ({
                label: message(KIND_LABELS[value]),
                value,
              })),
            },
          ]}
          onClose={() => setPickerOpen(false)}
          onSelect={(value) => {
            setKind(value as TimingKind)
            setPickerOpen(false)
          }}
          open={pickerOpen}
          rowRole="select"
          title={message('schedule.fieldTiming')}
        />
        <ConfirmSheet
          open={confirmRun}
          title={message('schedule.runConfirmTitle')}
          body={format('schedule.runConfirmBody', { title: task.title })}
          confirmLabel={message('schedule.runNow')}
          onCancel={() => setConfirmRun(false)}
          onConfirm={() => {
            setConfirmRun(false)
            runMutation.mutate()
          }}
        />
        <ConfirmSheet
          open={confirmDelete}
          title={message('schedule.remove')}
          body={format('schedule.removeBody', { title: task.title })}
          confirmLabel={message('schedule.remove')}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false)
            toggleMutation.mutate('delete')
          }}
        />
      </SafeAreaView>
    </Modal>
  )
}

function DeliveryRecordCard({
  onOpenSession,
  record,
}: {
  onOpenSession: () => void
  record: MobileScheduleDeliveryRecord
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [expanded, setExpanded] = useState(false)
  const formatStamp = (iso: string): string => {
    const ms = Date.parse(iso)
    return Number.isNaN(ms) ? iso : new Date(ms).toLocaleString()
  }
  const hasLongPrompt = record.prompt !== undefined && (record.prompt.length > 90 || record.prompt.includes('\n'))
  return (
    <View style={s.recordCard}>
      <View style={s.recordHead}>
        <Text style={s.recordTime}>
          {format('schedule.deliveryDeliveredAt', { time: formatStamp(record.deliveredAt) })}
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOpenSession}
          style={({ pressed }) => [s.openSessionBtn, pressed && s.pressed]}
        >
          <NativeIcon name="new-chat-outline" size={14} color={theme.colors.accent} />
          <Text style={s.openSessionText}>{message('schedule.deliveryOpenSession')}</Text>
        </Pressable>
      </View>
      <Text style={s.recordSubTime}>
        {format('schedule.deliveryScheduledAt', { time: formatStamp(record.scheduledAt) })}
      </Text>
      {record.prompt ? (
        <>
          <Text numberOfLines={expanded ? undefined : 2} selectable style={s.recordPrompt}>
            {record.prompt}
          </Text>
          {hasLongPrompt ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setExpanded((current) => !current)}
              style={s.expandRow}
            >
              <Text style={s.expandText}>
                {message(expanded ? 'schedule.deliveryCollapse' : 'schedule.deliveryExpand')}
              </Text>
              <NativeIcon
                name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={13}
                color={theme.colors.accent}
              />
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { backgroundColor: theme.colors.canvas, flex: 1 },
    flex: { flex: 1 },
    header: {
      alignItems: 'center',
      borderBottomColor: theme.colors.borderHairline,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 8,
      minHeight: 48,
      paddingHorizontal: 12,
    },
    headerIcon: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
    headerTitle: { color: theme.colors.ink, flex: 1, fontSize: 16, fontWeight: '500', lineHeight: 24 },
    headerActions: { alignItems: 'center', flexDirection: 'row', gap: 4 },
    tabs: {
      borderBottomColor: theme.colors.borderHairline,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    tab: { borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 6 },
    tabSelected: { backgroundColor: theme.colors.interactiveHover },
    tabText: { color: theme.colors.inkTertiary, fontSize: 14, lineHeight: 20 },
    tabTextSelected: { color: theme.colors.ink, fontWeight: '500' },
    body: { gap: 12, padding: 16, paddingBottom: 32 },
    banner: { borderRadius: theme.radius.control, borderWidth: StyleSheet.hairlineWidth, gap: 6, padding: 12 },
    bannerInfo: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
    bannerError: { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.dangerBorder },
    bannerInfoText: { color: theme.colors.accentText, fontSize: 13, lineHeight: 20 },
    bannerErrorText: { color: theme.colors.danger, fontSize: 13, lineHeight: 20 },
    reloadLink: { color: theme.colors.accent, fontSize: 13, fontWeight: '600', lineHeight: 20 },
    summaryCard: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 6,
      padding: 14,
    },
    summaryRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusPill: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      color: theme.colors.inkMuted,
      fontSize: 11,
      fontWeight: '500',
      lineHeight: 17,
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 1,
    },
    summaryMeta: { color: theme.colors.ink, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    summaryDetail: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    targetRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
    targetLabel: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    openSessionBtn: { alignItems: 'center', flexDirection: 'row', gap: 4, minHeight: 32, paddingHorizontal: 4 },
    openSessionText: { color: theme.colors.accent, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    fieldLabel: { color: theme.colors.ink, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    input: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      color: theme.colors.ink,
      fontSize: 15,
      lineHeight: 22,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    multiline: { minHeight: 88, textAlignVertical: 'top' },
    mono: { fontFamily: MONOSPACE_FONT },
    select: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 44,
      paddingHorizontal: 12,
    },
    selectText: { color: theme.colors.ink, fontSize: 15, lineHeight: 22 },
    weekdays: { flexDirection: 'row', gap: 6 },
    weekday: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    weekdayOn: { backgroundColor: theme.colors.accent },
    weekdayText: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 18 },
    weekdayTextOn: { color: theme.colors.onAccent, fontWeight: '600' },
    editActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
    center: { alignItems: 'center', gap: 10, paddingVertical: 32 },
    muted: { color: theme.colors.inkTertiary, fontSize: 13, lineHeight: 20 },
    retentionNote: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    recordCard: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 6,
      padding: 14,
    },
    recordHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    recordTime: { color: theme.colors.ink, flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    recordSubTime: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    recordPrompt: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    expandRow: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 4, minHeight: 28 },
    expandText: { color: theme.colors.accent, fontSize: 12, fontWeight: '500', lineHeight: 18 },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.62 },
  })
