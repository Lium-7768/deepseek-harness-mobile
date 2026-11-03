import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import { goalDockState } from '@/components/session-goal-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileGoalRef, MobileGoalView } from '@/types/mobile'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
  editRequest = 0,
}: {
  goal: MobileGoalView | undefined
  pending: boolean
  editRequest?: number
  onMutate: (action: 'edit' | 'pause' | 'resume' | 'clear', ref: MobileGoalRef, objective?: string) => Promise<void>
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const { width, fontScale } = useWindowDimensions()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [working, setWorking] = useState(false)
  const [clearedId, setClearedId] = useState<string>()
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const lastEditRequest = useRef(0)
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
    setClearedId(undefined)
  }, [goal?.id])
  useEffect(() => {
    if (editRequest === lastEditRequest.current) return
    lastEditRequest.current = editRequest
    if (editRequest > 0 && goal && goal.phase !== 'complete') {
      setDraft(goal.objective)
      setEditing(true)
    }
  }, [editRequest, goal?.id])
  const state = goalDockState(goal)
  if (goal === undefined || state === undefined || goal.id === clearedId) return null
  const currentGoal = goal
  const busy = pending || working
  const blockedReason = goal.phase === 'blocked' ? goal.blockedReason?.message?.trim() : undefined
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
            accessible
            accessibilityRole={blockedReason ? 'button' : undefined}
            accessibilityLabel={`${message(`activity.${state.label}`)} ${goal.objective}${blockedReason ? ` ${blockedReason}` : ''}`}
            onPress={blockedReason ? () => Alert.alert(message('activity.goalBlocked'), blockedReason) : undefined}
            style={[s.summary, largeText && s.summaryFullWidth]}
          >
            <View style={s.summaryHeading}>
              <View style={s.title}>
                <NativeIcon name="goal-outline" size={16} color={theme.colors.inkTertiary} />
                <Text style={s.label}>{message(`activity.${state.label}`)}</Text>
              </View>
              <Text numberOfLines={1} style={s.objective}>
                {goal.objective}
              </Text>
            </View>
            {blockedReason ? (
              <Text numberOfLines={1} style={s.reason}>
                {blockedReason}
              </Text>
            ) : null}
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
                label={message('activity.saveGoal')}
                icon="check-outline"
                disabled={busy || draft.trim() === ''}
                onPress={() => void run('edit', draft.trim())}
              />
              <GoalButton
                label={message('activity.cancelGoalEdit')}
                icon="close-outline"
                disabled={busy}
                onPress={() => setEditing(false)}
              />
            </>
          ) : (
            <>
              {state.action ? (
                <GoalButton
                  label={message(state.action === 'pause' ? 'activity.pauseGoal' : 'activity.resumeGoal')}
                  icon={state.action === 'pause' ? 'pause-outline' : 'play-outline'}
                  disabled={busy}
                  onPress={() => {
                    if (state.action) void run(state.action)
                  }}
                />
              ) : null}
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
    dock: { marginHorizontal: 16 },
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
    summary: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 2 },
    summaryHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    summaryFullWidth: { flex: 0, width: '100%' },
    title: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { color: theme.colors.ink, fontSize: 13, fontWeight: '500', lineHeight: 24, flexShrink: 1 },
    objective: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20, flex: 1, minWidth: 0 },
    reason: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
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
    disabled: { opacity: 0.4 },
    pressed: { backgroundColor: theme.colors.floatingHover },
  })
