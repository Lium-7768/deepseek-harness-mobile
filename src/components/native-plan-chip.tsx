import { NativeIcon } from '@/components/native-icon'
import { planChipVisible, type PlanState } from '@/components/plan-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

/**
 * Renders the composer's plan chip, the native `conversation.input.plan` seat.
 *
 * The Web shows it while plan mode is on or a toggle is un-settled, and hides it
 * once the latest toggle landed with plan mode off. Pressing it submits
 * `/plan off`, the command the desktop's own chip runs.
 *
 * @param props - The projected plan state, whether the composer is locked, and how to submit.
 * @returns The chip, or `null` while plan mode is off and settled.
 */
export function NativePlanChip({
  plan,
  locked,
  onExit,
}: {
  plan: PlanState | undefined
  locked: boolean
  /** Resolves to a failure message, or null once the command was accepted. */
  onExit: () => Promise<string | null>
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  if (!planChipVisible(plan)) return null
  const off = (): void => {
    // The Pressable is disabled in both states; the guard keeps a press that
    // still arrives (a stale responder, an accessibility activation) inert.
    if (locked || leaving) return
    setLeaving(true)
    setError(null)
    void onExit().then(
      (failure) => {
        if (!alive.current) return
        setLeaving(false)
        setError(failure)
      },
      (reason: unknown) => {
        if (!alive.current) return
        setLeaving(false)
        setError(reason instanceof Error ? reason.message : String(reason))
      },
    )
  }
  return (
    <View style={s.wrap}>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={message('plan.onLabel')}
        accessibilityRole="button"
        accessibilityState={{ disabled: locked || leaving }}
        disabled={locked || leaving}
        hitSlop={{ top: 8, bottom: 8 }}
        onPress={off}
        style={({ pressed }) => [s.chip, (locked || leaving) && s.disabled, pressed && s.pressed]}
      >
        <View style={s.glyph}>
          <NativeIcon name="plan-outline" size={14} color={theme.colors.accentText} />
        </View>
        <Text maxFontSizeMultiplier={1.4} style={s.label}>
          {message('plan.label')}
        </Text>
      </Pressable>
      {error === null ? null : (
        <Text accessibilityRole="alert" numberOfLines={1} style={s.error}>
          {message('plan.exitFailed')}
        </Text>
      )}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `PlanModeControl .wrap`: the chip and its failure line share one row, 6 apart.
    wrap: { alignItems: 'center', flexDirection: 'row', flexShrink: 0, gap: 6, minWidth: 0 },
    // `PlanModeControl .chip`: a 28-tall capsule on r8 over the business tertiary
    // fill, 13/20 medium in the business primary tone, 4 between glyph and label.
    chip: {
      alignItems: 'center',
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.sm,
      flexDirection: 'row',
      gap: 4,
      height: 28,
      minWidth: 34,
      paddingHorizontal: 8,
    },
    // `.chip:disabled`: the Web dims it to 0.6 while a toggle is in flight.
    disabled: { opacity: 0.6 },
    // `.glyph`: one 14pt slot ahead of the label.
    glyph: { alignItems: 'center', height: 14, justifyContent: 'center', width: 14 },
    label: { color: theme.colors.accentText, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    // `.error`: 12/18 in the error tone, one line beside the chip.
    error: { color: theme.colors.danger, flexShrink: 1, fontSize: 12, lineHeight: 18, minWidth: 0 },
    pressed: { opacity: 0.62 },
  })
