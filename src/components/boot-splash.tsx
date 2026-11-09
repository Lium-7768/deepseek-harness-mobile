import { NativeWhaleMark } from '@/components/native-whale-mark'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

/** `cubic-bezier(0.4, 0, 0.2, 1)`, the desktop `--ds-ease-in-out`, as a UI-thread worklet. */
const BRAND_EASING = Easing.bezier(0.4, 0, 0.2, 1)

const ENTER_MS = 320
/** Outline-to-fill transition; the cover must outlive it. */
const WARM_UP_MS = 720
/**
 * Shortest time the cover stays after the app reports it is ready.
 *
 * Measured from readiness rather than from mount: on a cold start the cover mounts
 * with the runtime, and readiness can arrive a second later, so a mount-relative
 * floor had already elapsed and the mark's entrance was cut off after ~200ms. This
 * keeps the mark fully drawn for a beat before the fade.
 */
const MIN_READY_HOLD_MS = 360
const LIFT_PX = 8
const EXIT_MS = 240

/**
 * Covers the first frame with the brand until the stored connection is read.
 *
 * The native launch screen is a still image on a flat fill, so the handover used
 * to be a hard cut. This overlay draws the same mark on the app's own background,
 * lets it settle in, and then fades out once the first route can render — the
 * sequence reads as one launch instead of two screens. Reduced motion skips both
 * halves: the mark is simply there, and it is simply gone.
 *
 * @param props.ready - Whether the app can show its first screen.
 * @returns The overlay, or `null` once it has finished.
 */
export function BootSplash({ ready }: { ready: boolean }): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  const [gone, setGone] = useState(false)
  const enter = useSharedValue(0)
  const exit = useSharedValue(0)

  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (!active) return
        if (reduced) {
          enter.value = 1
          return
        }
        enter.value = withTiming(1, { duration: ENTER_MS, easing: BRAND_EASING })
      })
    return () => {
      active = false
      cancelAnimation(enter)
    }
  }, [enter])

  useEffect(() => {
    if (!ready) return
    let active = true
    // Hold from readiness, and never less than the entrance: the mark has to be fully
    // drawn for a beat before the cover starts to leave.
    // The mark itself takes WARM_UP_MS to gain its fill; the cover leaves after that
    // plus the ready floor, so the reader sees a finished mark before the app.
    const hold = WARM_UP_MS + Math.max(ENTER_MS + 100, MIN_READY_HOLD_MS)
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (!active) return
        if (reduced) {
          runOnJS(setGone)(true)
          return
        }
        exit.value = withDelay(
          hold,
          withTiming(1, { duration: EXIT_MS, easing: BRAND_EASING }, (finished) => {
            if (finished) runOnJS(setGone)(true)
          }),
        )
      })
    return () => {
      active = false
      cancelAnimation(exit)
    }
  }, [exit, ready])

  // The mark settles in with the cover, then the cover leaves over it.
  const markStyle = useAnimatedStyle(() => ({
    opacity: enter.value * (1 - exit.value),
    transform: [{ translateY: (1 - enter.value) * LIFT_PX }, { scale: 0.94 + enter.value * 0.06 }],
  }))
  const coverStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }))

  if (gone) return null
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[s.cover, coverStyle]}
    >
      <View style={s.center}>
        <Animated.View style={markStyle}>
          <NativeWhaleMark size={84} />
        </Animated.View>
      </View>
    </Animated.View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `StyleSheet.absoluteFillObject` written out: the overlay covers the whole
    // window, including the status bar area the launch image already filled.
    cover: {
      backgroundColor: theme.colors.background,
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  })
