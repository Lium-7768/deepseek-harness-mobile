import { useAppTheme } from '@/theme/hooks'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, AppState } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** Desktop StateDot: 14pt track, 12→24 breathing arc, and one 1.5s rotation. */
export function NativeRunningRing(): React.JSX.Element {
  const theme = useAppTheme()
  const progress = useSharedValue(0)
  const [reduced, setReduced] = useState(true)
  const [foreground, setForeground] = useState(AppState.currentState === 'active')
  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value)
      })
      .catch(() => undefined)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    const appState = AppState.addEventListener('change', (value) => setForeground(value === 'active'))
    return () => {
      active = false
      subscription.remove()
      appState.remove()
    }
  }, [])
  useEffect(() => {
    cancelAnimation(progress)
    progress.value = 0
    if (reduced || !foreground) return
    // Both rotation and SVG props are evaluated on the UI thread, never per frame on JS.
    progress.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1)
    return () => cancelAnimation(progress)
  }, [progress, reduced, foreground])
  const rotation = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.value * 360}deg` }] }))
  const arc = useAnimatedProps(() => ({
    strokeDasharray: [interpolate(progress.value, [0, 0.5, 1], [12, 24, 12]), 150],
    strokeDashoffset: interpolate(progress.value, [0, 0.5, 1], [0, -6, 0]),
  }))
  return (
    <Animated.View accessible={false} style={[{ width: 14, height: 14 }, rotation]}>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Circle
          cx={12}
          cy={12}
          r={9.5}
          fill="none"
          stroke={theme.colors.inkTertiary}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.25}
        />
        <AnimatedCircle
          cx={12}
          cy={12}
          r={9.5}
          fill="none"
          stroke={theme.colors.inkTertiary}
          strokeWidth={2}
          strokeLinecap="round"
          animatedProps={arc}
        />
      </Svg>
    </Animated.View>
  )
}
