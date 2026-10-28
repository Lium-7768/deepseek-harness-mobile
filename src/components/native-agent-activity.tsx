import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { NativeIcon } from '@/components/native-icon'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileGoalRef, MobileGoalView, MobileJobView, MobileSubagentEntry } from '@/types/mobile'
import { format, t as message } from '@/locale'

type MobileChildSubagentEntry = Extract<MobileSubagentEntry, { kind: 'child' }>
type MobileContinuableSubagentEntry = MobileChildSubagentEntry & { mode: 'continuable' }

/** Reads the desktop-owned `goal` projection without creating a second mobile goal store. */
export function goalFromProjection(values: Record<string, unknown> | undefined): MobileGoalView | undefined {
  const projection = asRecord(values?.goal)
  const candidate = asRecord(projection?.goal) ?? projection
  if (candidate === undefined) return undefined
  const id = text(candidate.id)
  const objective = text(candidate.objective)
  const revision = candidate.revision
  const phase = candidate.phase
  if (id === undefined || objective === undefined || typeof revision !== 'number' || !Number.isInteger(revision)) return undefined
  if (phase !== 'active' && phase !== 'paused' && phase !== 'blocked' && phase !== 'complete') return undefined
  const blocked = asRecord(candidate.blockedReason)
  const blockedMessage = text(blocked?.message)
  return {
    id,
    revision,
    objective,
    phase,
    ...(blockedMessage === undefined ? {} : { blockedReason: { message: blockedMessage } }),
  }
}

/** Renders the desktop Goal projection and only forwards the Web GoalBar's four existing mutations. */
export function NativeGoalBar({
  goal,
  pending,
  onMutate,
}: {
  goal: MobileGoalView | undefined
  pending: boolean
  onMutate: (action: 'edit' | 'pause' | 'resume' | 'clear', ref: MobileGoalRef, objective?: string) => void
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  useEffect(() => {
    setEditing(false)
    setDraft(goal?.objective ?? '')
  }, [goal?.id, goal?.objective])
  if (goal === undefined || goal.phase === 'complete') return null
  const ref = { id: goal.id, revision: goal.revision }
  const status = goal.phase === 'active' ? message('activity.goalRunning') : goal.phase === 'paused' ? message('activity.goalPaused') : message('activity.goalBlocked')
  const save = () => {
    const objective = draft.trim()
    if (objective === '') return
    onMutate('edit', ref, objective)
    setEditing(false)
  }
  return (
    <View style={[styles.goal, goal.phase === 'blocked' && styles.goalBlocked]}>
      <View style={styles.goalHeader}>
        <View style={styles.goalTitle}>
          <NativeIcon name="goal-outline" size={16} color={theme.colors.accentText} />
          <Text style={styles.goalStatus}>{status}</Text>
        </View>
        <View style={styles.goalActions}>
          {goal.phase === 'active' ? (
            <GoalIconButton label={message('activity.pauseGoal')} icon="stop-fill" disabled={pending} onPress={() => onMutate('pause', ref)} />
          ) : goal.phase === 'paused' ? (
            <GoalIconButton label={message('activity.resumeGoal')} icon="chevron-right-outline" disabled={pending} onPress={() => onMutate('resume', ref)} />
          ) : null}
          <GoalIconButton label={message('activity.editGoal')} icon="edit-outline" disabled={pending} onPress={() => setEditing(current => !current)} />
          <GoalIconButton label={message('activity.clearGoal')} icon="close-outline" disabled={pending} onPress={() => onMutate('clear', ref)} />
        </View>
      </View>
      {editing ? (
        <View style={styles.editor}>
          <TextInput
            accessibilityLabel={message('activity.goalLabel')}
            editable={!pending}
            multiline
            onChangeText={setDraft}
            style={styles.goalInput}
            value={draft}
          />
          <View style={styles.editorActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              disabled={pending}
              onPress={() => setEditing(false)}
              style={styles.textAction}
            >
              <Text style={styles.textActionLabel}>{message('common.cancel')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: pending || draft.trim() === '' }}
              disabled={pending || draft.trim() === ''}
              onPress={save}
              style={styles.textAction}
            >
              <Text style={[styles.textActionLabel, styles.textActionPrimary]}>{message('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.goalObjective}>{goal.objective}</Text>
      )}
      {goal.blockedReason?.message ? <Text style={styles.goalReason}>{goal.blockedReason.message}</Text> : null}
    </View>
  )
}

/** Displays the same host-owned job summary and direct-child catalog used by the desktop Web header. */
export function NativeAgentActivity({
  jobs,
  subagents,
  interruptingId,
  onOpenSubagent,
  onInterruptSubagent,
}: {
  jobs: MobileJobView[]
  subagents: MobileSubagentEntry[]
  interruptingId?: string
  onOpenSubagent: (entry: MobileChildSubagentEntry) => void
  onInterruptSubagent: (entry: MobileContinuableSubagentEntry) => void
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const children = subagents.filter((entry): entry is MobileChildSubagentEntry => entry.kind === 'child')
  const diagnostics = subagents.filter((entry): entry is Extract<MobileSubagentEntry, { kind: 'diagnostic' }> => entry.kind === 'diagnostic')
  if (jobs.length === 0 && children.length === 0 && diagnostics.length === 0) return null
  return (
    <View style={styles.activity}>
      {jobs.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{message('activity.backgroundJobs')}</Text>
          {jobs.map(job => <JobRow key={job.id} job={job} />)}
        </View>
      ) : null}
      {children.length > 0 || diagnostics.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{message('activity.subagents')}</Text>
          {children.map(entry => (
            <View key={entry.id} style={styles.subagentRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={format('activity.openSubagent', { name: entry.label ?? entry.id })}
                onPress={() => onOpenSubagent(entry)}
                style={({ pressed }) => [styles.subagentMain, pressed && styles.pressed]}
              >
                <NativeIcon name="agent-preset-outline" size={16} color={theme.colors.accentText} />
                <View style={styles.subagentCopy}>
                  <Text numberOfLines={1} style={styles.subagentLabel}>{entry.label ?? entry.id}</Text>
                  <Text style={styles.subagentMeta}>{entry.activity === 'running' ? message('activity.subagentRunning') : message('activity.subagentIdle')} · {entry.mode === 'continuable' ? message('activity.subagentContinuable') : message('activity.subagentOneShot')}</Text>
                </View>
                <NativeIcon name="chevron-right-outline" size={16} color={theme.colors.inkMuted} />
              </Pressable>
              {entry.mode === 'continuable' && entry.activity === 'running' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={format('activity.stopSubagent', { name: entry.label ?? entry.id })}
                  accessibilityState={{ busy: interruptingId === entry.id }}
                  disabled={interruptingId !== undefined}
                  onPress={() => onInterruptSubagent({ ...entry, mode: 'continuable' })}
                  style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}
                >
                  <NativeIcon name="stop-fill" size={14} color={theme.colors.danger} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {diagnostics.map(entry => <Text key={entry.id} style={styles.diagnostic}>{format('activity.subagentDiagnostic', { name: entry.id, reason: entry.reason })}</Text>)}
        </View>
      ) : null}
    </View>
  )
}

function GoalIconButton({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string
  icon: 'stop-fill' | 'chevron-right-outline' | 'edit-outline' | 'close-outline'
  disabled: boolean
  onPress: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.iconAction, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <NativeIcon name={icon} size={15} color={theme.colors.inkMuted} />
    </Pressable>
  )
}

function JobRow({ job }: { job: MobileJobView }): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const live = job.status === 'running' || job.status === 'stopping'
  return (
    <View style={styles.jobRow}>
      <View style={[styles.dot, live ? styles.dotLive : styles.dotIdle]} />
      <View style={styles.jobCopy}>
        <Text numberOfLines={1} style={styles.jobLabel}>{job.label || job.kind}</Text>
        <Text numberOfLines={1} style={styles.jobMeta}>{job.detail ?? job.status}</Text>
      </View>
      <Text style={styles.jobKind}>{job.kind}</Text>
    </View>
  )
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    goal: {
      backgroundColor: theme.colors.accentSoft,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 7,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    goalBlocked: { backgroundColor: theme.colors.warningSoft },
    goalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    goalTitle: { alignItems: 'center', flexDirection: 'row', gap: 6 },
    goalStatus: { color: theme.colors.accentText, fontSize: 12, fontWeight: '700' },
    goalActions: { alignItems: 'center', flexDirection: 'row', gap: 2 },
    iconAction: { alignItems: 'center', height: 30, justifyContent: 'center', width: 30 },
    goalObjective: { color: theme.colors.ink, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    goalReason: { color: theme.colors.warning, fontSize: 12, lineHeight: 18 },
    editor: { gap: 8 },
    goalInput: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.control,
      borderWidth: 1,
      color: theme.colors.ink,
      minHeight: 70,
      padding: 9,
      textAlignVertical: 'top',
    },
    editorActions: { alignItems: 'center', flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
    textAction: { minHeight: theme.touch.minTarget, justifyContent: 'center', paddingHorizontal: 4 },
    textActionLabel: { color: theme.colors.inkMuted, fontSize: 13, fontWeight: '600' },
    textActionPrimary: { color: theme.colors.accentText },
    activity: {
      backgroundColor: theme.colors.surfaceRaised,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    section: { gap: 7 },
    sectionTitle: { color: theme.colors.inkMuted, fontSize: 12, fontWeight: '700' },
    jobRow: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 30 },
    dot: { borderRadius: 4, height: 7, width: 7 },
    dotLive: { backgroundColor: theme.colors.success },
    dotIdle: { backgroundColor: theme.colors.inkFaint },
    jobCopy: { flex: 1, gap: 1 },
    jobLabel: { color: theme.colors.ink, fontSize: 13, fontWeight: '600' },
    jobMeta: { color: theme.colors.inkMuted, fontSize: 12 },
    jobKind: { color: theme.colors.inkFaint, fontSize: 11 },
    subagentRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
    subagentMain: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8, minHeight: theme.touch.minTarget },
    subagentCopy: { flex: 1, gap: 1 },
    subagentLabel: { color: theme.colors.ink, fontSize: 13, fontWeight: '600' },
    subagentMeta: { color: theme.colors.inkMuted, fontSize: 12 },
    stopButton: { alignItems: 'center', height: theme.touch.iconButton, justifyContent: 'center', width: theme.touch.iconButton },
    diagnostic: { color: theme.colors.warning, fontSize: 12, lineHeight: 18 },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.62 },
  })
