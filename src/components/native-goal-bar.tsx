import { ConfirmSheet } from '@/components/confirm-sheet'
import { NativeGoalEditor } from '@/components/native-goal-editor'
import { NativeIcon } from '@/components/native-icon'
import { NativeMenuPanel } from '@/components/native-menu-panel'
import { goalDockState } from '@/components/session-goal-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileGoalRef, MobileGoalView } from '@/types/mobile'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
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
    if (editRequest > 0 && goal && goal.phase !== 'complete') setEditing(true)
  }, [editRequest, goal])
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
      <View style={[s.bar, largeText && s.barStacked]}>
        <Pressable
          android_ripple={{ borderless: false }}
          accessible
          accessibilityRole={blockedReason ? 'button' : undefined}
          accessibilityLabel={`${message(`activity.${state.label}`)} ${goal.objective}${blockedReason ? ` ${blockedReason}` : ''}`}
          onPress={blockedReason ? () => Alert.alert(message('activity.goalBlocked'), blockedReason) : undefined}
          style={[s.summary, largeText && s.summaryFullWidth]}
        >
          <View style={s.summaryHeading}>
            <View style={s.title}>
              <NativeIcon name="goal-outline" size={16} color={theme.colors.inkMuted} />
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
        {/* One control instead of three: this bar sits directly above the composer,
            and its verbs are used far less often than the draft beneath it. */}
        <Pressable
          android_ripple={{ borderless: false }}
          accessibilityLabel={message('activity.goalActions')}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, expanded: menuOpen }}
          disabled={busy}
          hitSlop={8}
          onPress={() => setMenuOpen((current) => !current)}
          style={({ pressed }) => [s.icon, busy && s.disabled, pressed && s.pressed]}
        >
          {busy ? (
            <ActivityIndicator
              accessibilityLabel={message('common.loading')}
              size="small"
              color={theme.colors.inkMuted}
            />
          ) : (
            <NativeIcon name="ellipsis-outline" size={16} color={theme.colors.inkMuted} />
          )}
        </Pressable>
      </View>
      <NativeMenuPanel
        actionMenu
        groups={[
          {
            options: [
              ...(state.action === undefined
                ? []
                : [
                    {
                      icon: (state.action === 'pause' ? 'pause-outline' : 'play-outline') as
                        'pause-outline' | 'play-outline',
                      label: message(state.action === 'pause' ? 'activity.pauseGoal' : 'activity.resumeGoal'),
                      value: 'toggle',
                    },
                  ]),
              { icon: 'edit-outline' as const, label: message('activity.editGoal'), value: 'edit' },
              { icon: 'trash-outline' as const, label: message('activity.clearGoal'), value: 'clear' },
            ],
          },
        ]}
        onClose={() => setMenuOpen(false)}
        onSelect={(value) => {
          setMenuOpen(false)
          if (value === 'toggle' && state.action !== undefined) void run(state.action)
          else if (value === 'edit') setEditing(true)
          else if (value === 'clear') setConfirmingClear(true)
        }}
        open={menuOpen}
        title={message('activity.goalActions')}
      />
      <NativeGoalEditor
        initial={goal.objective}
        onClose={() => setEditing(false)}
        onCreate={(objective) => run('edit', objective)}
        open={editing}
        pending={busy}
        title={message('activity.editGoal')}
      />
      <ConfirmSheet
        body={message('activity.clearGoalBody')}
        confirmLabel={message('activity.clearGoal')}
        onCancel={() => setConfirmingClear(false)}
        onConfirm={() => {
          setConfirmingClear(false)
          void run('clear')
        }}
        open={confirmingClear}
        title={message('activity.clearGoal')}
      />
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    dock: { marginHorizontal: 16 },
    // `GoalBar .bar`: `4px 5px 4px 12px`, gap 10, a 36-tall menu surface on r12.
    // The action buttons keep the desktop's 28pt box; hitSlop carries the touch
    // target to 44 without growing the bar past the desktop's height.
    bar: {
      ...theme.elevation.card,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderHairline,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 36,
      paddingLeft: 12,
      paddingRight: 5,
      paddingVertical: 4,
    },
    barStacked: { alignItems: 'stretch', flexDirection: 'column' },
    summary: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 2 },
    summaryHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    summaryFullWidth: { flex: 0, width: '100%' },
    title: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { color: theme.colors.ink, fontSize: 13, fontWeight: '500', lineHeight: 24, flexShrink: 1 },
    objective: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20, flex: 1, minWidth: 0 },
    reason: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18 },
    actions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
    actionsTrailing: { alignSelf: 'flex-end' },
    // The desktop's 28pt action box; hitSlop on the Pressable brings the target
    // to 44 so the bar can stay 36 tall.
    icon: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 28,
      minHeight: 28,
      borderRadius: theme.radius.control,
    },
    disabled: { opacity: 0.4 },
    pressed: { backgroundColor: theme.colors.floatingHover },
  })
