import { useAppTheme } from '@/theme/hooks'
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** Desktop StateDot: 14pt track, 12→24 breathing arc, and one 1.5s rotation. */
export function NativeRunningRing(): React.JSX.Element {
  const theme = useAppTheme()
  const progress = useRef(new Animated.Value(0)).current
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value)
      })
      .catch(() => undefined)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
  useEffect(() => {
    progress.setValue(0)
    if (reduced) return
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: false,
        isInteraction: false,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [progress, reduced])
  const dash = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [12, 24, 12] })
  return (
    <Animated.View
      accessible={false}
      style={{
        width: 14,
        height: 14,
        transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    >
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
          strokeDasharray={[dash, 150]}
          strokeDashoffset={progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -6, 0] })}
        />
      </Svg>
    </Animated.View>
  )
}
