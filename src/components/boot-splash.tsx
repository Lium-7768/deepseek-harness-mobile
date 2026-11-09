import { NativeBrandMark } from '@/components/native-brand-mark'
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
/**
 * Shortest time the cover stays, measured from mount.
 *
 * A warm start finishes reading the stored connection before the first frame, so
 * the entrance would otherwise be cut off after ~80ms and read as a flicker rather
 * than a launch. 450ms is under the point where a splash feels like a delay.
 */
const MIN_VISIBLE_MS = 450
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
  const [mountedAt] = useState(() => Date.now())
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
    // The shrink effect can arm on the frame the store finishes reading, before the
    // mark's own entrance has run: keep the cover until the mark has landed, and for
    // the floor measured from mount.
    const elapsed = Date.now() - mountedAt
    const hold = Math.max(ENTER_MS + 120 - elapsed, MIN_VISIBLE_MS - elapsed, 0)
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
  }, [exit, mountedAt, ready])

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
          <NativeBrandMark size={72} />
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
