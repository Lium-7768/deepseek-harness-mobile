/**
 * Loading placeholders that hold a screen's final layout.
 *
 * A bare spinner tells the user only that something is happening; a skeleton
 * also tells them what is arriving and keeps the first real layout from jumping.
 * Use it for a screen's first paint, and keep `ActivityIndicator` for actions
 * that are already in view (a submit button's pending state).
 */
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, View, type ViewStyle } from 'react-native'
import { useAppTheme } from '@/theme/hooks'

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
export function SkeletonBlock({ width = '100%', height = 14, radius, style }: SkeletonBlockProps): React.JSX.Element {
  const theme = useAppTheme()
  const reducedMotion = useReducedMotion()
  const pulse = useRef(new Animated.Value(0.55)).current

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(0.8)
      return
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [pulse, reducedMotion])

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          backgroundColor: theme.colors.skeleton,
          borderRadius: radius ?? theme.radius.control,
          height,
          opacity: pulse,
          width,
        },
        style,
      ]}
    />
  )
}

/** Geometry for a skeleton that mimics a list of short rows. */
export interface SkeletonListProps {
  /** Number of placeholder rows. */
  rows?: number
  /** Vertical gap between rows in logical pixels. */
  gap?: number
  /** Extra layout applied to the container. */
  style?: ViewStyle
}

/**
 * Render a list-shaped placeholder.
 *
 * @param props - Row count and spacing.
 * @returns The placeholder container.
 */
export function SkeletonList({ rows = 6, gap = 12, style }: SkeletonListProps): React.JSX.Element {
  const theme = useAppTheme()
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ gap, paddingHorizontal: theme.spacing.lg }, style]}
    >
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={{ gap: theme.spacing.xs }}>
          <SkeletonBlock height={13} width={index % 3 === 0 ? '58%' : '76%'} />
          <SkeletonBlock height={11} width={index % 2 === 0 ? '34%' : '46%'} />
        </View>
      ))}
    </View>
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
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: theme.spacing.lg, padding: theme.spacing.lg }}>
      {widths.map((width, index) => (
        <View key={index} style={{ gap: theme.spacing.sm }}>
          <SkeletonBlock height={12} radius={theme.radius.pill} width="22%" />
          <SkeletonBlock height={14} width={width} />
          {index % 2 === 1 ? <SkeletonBlock height={14} width="52%" /> : null}
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
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
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
