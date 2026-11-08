/**
 * Loading placeholders that hold a screen's final layout.
 *
 * A bare spinner tells the user only that something is happening; a skeleton
 * also tells them what is arriving and keeps the first real layout from jumping.
 * Use it for a screen's first paint, and keep `ActivityIndicator` for actions
 * that are already in view (a submit button's pending state).
 */
import { useAppTheme } from '@/theme/hooks'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, View, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

/** One placeholder block. */
export interface SkeletonBlockProps {
  /** Block width; a number is logical pixels, a string is a percentage. */
  width?: ViewStyle['width']
  /** Block height in logical pixels. */
  height?: number
  /** Corner radius; defaults to the theme control radius. */
  radius?: number
  /** Extra layout applied to the block. */
  style?: ViewStyle
  /**
   * Delay before the pulse starts, so a column of blocks reads as a wave instead
   * of blinking in unison.
   */
  delay?: number
}

/**
 * Render one animated placeholder block.
 *
 * The pulse is decorative: when the platform reports reduced motion the block
 * renders at a steady opacity instead of animating.
 *
 * @param props - Block geometry.
 * @returns The placeholder view.
 */
export function SkeletonBlock({
  delay = 0,
  width = '100%',
  height = 14,
  radius,
  style,
}: SkeletonBlockProps): React.JSX.Element {
  const theme = useAppTheme()
  const reducedMotion = useReducedMotion()
  const pulse = useSharedValue(0.55)

  useEffect(() => {
    cancelAnimation(pulse)
    if (reducedMotion) {
      pulse.value = 0.8
      return
    }
    pulse.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1520, easing: Easing.inOut(Easing.quad) }), -1, true),
    )
    return () => cancelAnimation(pulse)
  }, [delay, pulse, reducedMotion])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }))

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          backgroundColor: theme.colors.skeleton,
          borderRadius: radius ?? theme.radius.control,
          height,
          width,
        },
        animatedStyle,
        style,
      ]}
    />
  )
}

/**
 * Render a conversation-shaped placeholder: alternating short and long blocks.
 *
 * @returns The placeholder container.
 */
export function SkeletonConversation(): React.JSX.Element {
  const theme = useAppTheme()
  const widths: ViewStyle['width'][] = ['72%', '88%', '64%', '92%', '78%']
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ gap: theme.spacing.lg, padding: theme.spacing.lg }}
    >
      {widths.map((width, index) => (
        <View key={index} style={{ gap: theme.spacing.sm }}>
          <SkeletonBlock delay={index * 70} height={12} radius={theme.radius.pill} width="22%" />
          <SkeletonBlock delay={index * 70 + 40} height={14} width={width} />
          {index % 2 === 1 ? <SkeletonBlock delay={index * 70 + 80} height={14} width="52%" /> : null}
        </View>
      ))}
    </View>
  )
}

/**
 * Report whether the platform asks for reduced motion.
 *
 * The query resolves asynchronously and the setting can change while the app
 * runs, so this subscribes instead of reading once.
 *
 * @returns Whether decorative animation must stay still.
 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
  return reduced
}
