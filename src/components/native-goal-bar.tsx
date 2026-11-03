import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import { goalDockState } from '@/components/session-goal-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileGoalRef, MobileGoalView } from '@/types/mobile'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'

/** Desktop goal dock, with larger native touch targets and wrapping for enlarged text. */
export function NativeGoalBar({
  goal,
  pending,
  onMutate,
}: {
  goal: MobileGoalView | undefined
  pending: boolean
  onMutate: (action: 'edit' | 'pause' | 'resume' | 'clear', ref: MobileGoalRef, objective?: string) => Promise<void>
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const { width, fontScale } = useWindowDimensions()
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState('')
  const [working, setWorking] = useState(false)
  const [clearedId, setClearedId] = useState<string>()
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const goalId = useRef(goal?.id)
  goalId.current = goal?.id
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    setEditing(false)
    setExpanded(false)
    setClearedId(undefined)
  }, [goal?.id])
  const state = goalDockState(goal)
  if (goal === undefined || state === undefined || goal.id === clearedId) return null
  const currentGoal = goal
  const busy = pending || working
  const stacked = width / Math.max(fontScale, 1) < 600
  const largeText = width / Math.max(fontScale, 1) < 300
  async function run(action: 'edit' | 'pause' | 'resume' | 'clear', objective?: string): Promise<void> {
    if (pending || inFlight.current) return
    inFlight.current = true
    setWorking(true)
    try {
      await onMutate(action, { id: currentGoal.id, revision: currentGoal.revision }, objective)
      if (!mounted.current || goalId.current !== currentGoal.id) return
      if (action === 'edit') setEditing(false)
      if (action === 'clear') setClearedId(currentGoal.id)
    } catch {
      // The session mutation presents the error; keep the draft available to retry.
    } finally {
      inFlight.current = false
      if (mounted.current) setWorking(false)
    }
  }
  return (
    <View style={s.dock}>
      <View style={[s.bar, (editing || largeText) && s.barStacked]}>
        {editing ? (
          <TextInput
            accessibilityLabel={message('activity.goalLabel')}
            autoFocus
            editable={!busy}
            multiline
            onChangeText={setDraft}
            placeholderTextColor={theme.colors.inkFaint}
            selectionColor={theme.colors.accent}
            style={s.input}
            value={draft}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${message(`activity.${state.label}`)} ${goal.objective}`}
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((value) => !value)}
            style={[s.summary, stacked && s.summaryStacked, largeText && s.summaryFullWidth]}
          >
            <View style={s.title}>
              <NativeIcon name="goal-outline" size={16} color={theme.colors.inkTertiary} />
              <Text style={s.label}>{message(`activity.${state.label}`)}</Text>
            </View>
            <Text numberOfLines={1} style={[s.objective, stacked && s.objectiveStacked]}>
              {goal.objective}
            </Text>
          </Pressable>
        )}
        <View style={[s.actions, (editing || largeText) && s.actionsTrailing]}>
          {busy ? (
            <ActivityIndicator
              accessibilityLabel={message('common.loading')}
              size="small"
              color={theme.colors.inkMuted}
            />
          ) : null}
          {editing ? (
            <>
              <GoalButton
                label={message('common.cancel')}
                icon="close-outline"
                disabled={busy}
                onPress={() => setEditing(false)}
              />
              <GoalButton
                label={message('common.save')}
                icon="check-outline"
                disabled={busy || draft.trim() === ''}
                onPress={() => void run('edit', draft.trim())}
              />
            </>
          ) : (
            <>
              <GoalButton
                label={message(state.action === 'pause' ? 'activity.pauseGoal' : 'activity.resumeGoal')}
                icon={state.action === 'pause' ? 'pause-outline' : 'play-outline'}
                disabled={busy}
                onPress={() => void run(state.action)}
              />
              <GoalButton
                label={message('activity.editGoal')}
                icon="edit-outline"
                disabled={busy}
                onPress={() => {
                  setDraft(goal.objective)
                  setEditing(true)
                }}
              />
              <GoalButton
                label={message('activity.clearGoal')}
                icon="trash-outline"
                disabled={busy}
                onPress={() => void run('clear')}
              />
            </>
          )}
        </View>
      </View>
      {expanded && !editing ? (
        <ScrollView style={s.details} contentContainerStyle={s.detailsContent}>
          <Text style={s.detailText}>{goal.objective}</Text>
          {goal.blockedReason?.message ? <Text style={s.reason}>{goal.blockedReason.message}</Text> : null}
        </ScrollView>
      ) : null}
    </View>
  )
}

function GoalButton({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string
  icon: NativeIconName
  disabled: boolean
  onPress: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.icon, disabled && s.disabled, pressed && s.pressed]}
    >
      <NativeIcon name={icon} size={16} color={theme.colors.inkTertiary} />
    </Pressable>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    dock: { marginHorizontal: 8, marginBottom: 8 },
    bar: {
      ...theme.elevation.card,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderHairline,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 48,
      paddingLeft: 12,
      paddingRight: 2,
      paddingVertical: 4,
    },
    barStacked: { flexDirection: 'column', alignItems: 'stretch' },
    summary: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
    summaryStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
    summaryFullWidth: { flex: 0, width: '100%' },
    title: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { color: theme.colors.ink, fontSize: 13, fontWeight: '500', lineHeight: 24, flexShrink: 1 },
    objective: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20, flex: 1, minWidth: 0 },
    objectiveStacked: { flex: 0 },
    actions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
    actionsTrailing: { alignSelf: 'flex-end' },
    icon: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
      minHeight: 44,
      borderRadius: theme.radius.control,
    },
    input: {
      color: theme.colors.ink,
      fontSize: 14,
      lineHeight: 22,
      minHeight: 66,
      maxHeight: 140,
      padding: 4,
      textAlignVertical: 'top',
    },
    details: { maxHeight: 140 },
    detailsContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
    detailText: { color: theme.colors.ink, fontSize: 13, lineHeight: 20 },
    reason: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18 },
    disabled: { opacity: 0.4 },
    pressed: { backgroundColor: theme.colors.floatingHover },
  })
