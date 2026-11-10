import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeMenuPanel } from '@/components/native-menu-panel'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { timingOf, WEEKDAY_LABELS, type TimingKind } from '@/components/schedule-editor-logic'
import type { MobileScheduleCreateRequest } from '@/types/mobile'
import { useEffect, useState } from 'react'
import { MONOSPACE_FONT } from '@/theme/platform'
import { format } from '@/locale'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

/** The message key each timing kind prints as its label. */
const KIND_LABELS = {
  after: 'schedule.timingAfter',
  at: 'schedule.timingAt',
  cron: 'schedule.timingCron',
  daily: 'schedule.timingDaily',
  every: 'schedule.timingEvery',
  rrule: 'schedule.timingRrule',
  weekly: 'schedule.timingWeekly',
} as const satisfies Record<TimingKind, string>

/**
 * Creates one automation through the Host's own `schedule/create`.
 *
 * The desktop's create surface speaks the full timing union (cron, rrule, weekly,
 * absolute instants). A phone form offers the three shapes a person actually types
 * on a phone — after N minutes, every N hours, daily at a time — and forwards the
 * request unchanged, so the Host still validates and owns the schedule.
 *
 * @param props - Whether the sheet is open, the device time zone, and the submit handler.
 * @returns The sheet, or `null` while closed.
 */
export function ScheduleEditor({
  onClose,
  onCreate,
  open,
  pending,
  timeZone,
}: {
  onClose(): void
  onCreate(request: MobileScheduleCreateRequest): Promise<void>
  open: boolean
  pending: boolean
  /** IANA zone the daily rule is written in, taken from the device. */
  timeZone: string
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setPrompt('')
    setKind('daily')
    setTime('09:00')
    setHours('6')
    setMinutes('30')
    setDate('')
    setWeekdays([1])
    setCron('0 9 * * *')
    setRrule('FREQ=DAILY')
    setError(undefined)
  }, [open])

  const timing = timingOf({ cron, date, hours, kind, minutes, rrule, time, timeZone, weekdays }) ?? undefined
  const ready = title.trim() !== '' && prompt.trim() !== '' && timing !== undefined && !pending
  const submit = async (): Promise<void> => {
    if (timing === undefined) {
      setError(message('schedule.invalidTiming'))
      return
    }
    if (!ready) return
    setError(undefined)
    try {
      await onCreate({ title: title.trim(), prompt: prompt.trim(), timing })
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : message('common.retry'))
    }
  }
  const kindLabel = message(KIND_LABELS[kind])
  return (
    <NativeAnchoredPanel onClose={onClose} open={open}>
      <View style={s.content}>
        <Text style={s.title}>{message('schedule.createTitle')}</Text>
        <TextInput
          accessibilityLabel={message('schedule.fieldTitle')}
          editable={!pending}
          onChangeText={setTitle}
          placeholder={message('schedule.fieldTitlePlaceholder')}
          placeholderTextColor={theme.colors.inkTertiary}
          selectionColor={theme.colors.accent}
          style={s.input}
          value={title}
        />
        <TextInput
          accessibilityLabel={message('schedule.fieldPrompt')}
          editable={!pending}
          multiline
          onChangeText={setPrompt}
          placeholder={message('schedule.fieldPromptPlaceholder')}
          placeholderTextColor={theme.colors.inkTertiary}
          selectionColor={theme.colors.accent}
          style={[s.input, s.multiline]}
          value={prompt}
        />
        <Pressable
          accessibilityLabel={message('schedule.fieldTiming')}
          accessibilityRole="button"
          disabled={pending}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [s.select, pressed && s.pressed]}
        >
          <Text style={s.selectText}>{kindLabel}</Text>
        </Pressable>
        {kind === 'daily' ? (
          <TextInput
            accessibilityLabel={message('schedule.fieldTime')}
            autoCapitalize="none"
            editable={!pending}
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
            editable={!pending}
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
            editable={!pending}
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
            editable={!pending}
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
                  disabled={pending}
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
            editable={!pending}
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
            editable={!pending}
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
            editable={!pending}
            keyboardType="number-pad"
            onChangeText={setMinutes}
            selectionColor={theme.colors.accent}
            style={s.input}
            value={minutes}
          />
        ) : null}
        {error === undefined ? null : (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <View style={s.actions}>
          <NativeActionButton
            disabled={!ready}
            icon="check-outline"
            label={message('schedule.createAction')}
            loading={pending}
            onPress={() => void submit()}
          />
          <NativeActionButton
            disabled={pending}
            icon="close-outline"
            label={message('common.cancel')}
            onPress={onClose}
            variant="secondary"
          />
        </View>
      </View>
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
    </NativeAnchoredPanel>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: { gap: 10, padding: 16 },
    title: { color: theme.colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 },
    // One row of ISO weekday chips; the Host rejects an empty set, so the form does too.
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
    mono: { fontFamily: MONOSPACE_FONT },
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
    select: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      minHeight: 44,
      paddingHorizontal: 12,
    },
    selectText: { color: theme.colors.ink, fontSize: 15, lineHeight: 22 },
    error: { color: theme.colors.danger, fontSize: 13, lineHeight: 20 },
    actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
    pressed: { opacity: 0.62 },
  })
