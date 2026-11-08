import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeMenuPanel } from '@/components/native-menu-panel'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { timingOf, type TimingKind } from '@/components/schedule-editor-logic'
import type { MobileScheduleCreateRequest } from '@/types/mobile'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

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
    setError(undefined)
  }, [open])

  const timing = timingOf({ hours, kind, minutes, time, timeZone }) ?? undefined
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
  const kindLabel =
    kind === 'daily'
      ? message('schedule.timingDaily')
      : kind === 'every'
        ? message('schedule.timingEvery')
        : message('schedule.timingAfter')
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
            options: [
              { label: message('schedule.timingDaily'), value: 'daily' },
              { label: message('schedule.timingEvery'), value: 'every' },
              { label: message('schedule.timingAfter'), value: 'after' },
            ],
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
