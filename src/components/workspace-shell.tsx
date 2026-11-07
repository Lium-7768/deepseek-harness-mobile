import { NativeIcon } from '@/components/native-icon'
import { shouldShowOfflineBar, workspaceHeaderMinHeight } from '@/components/workspace-shell-logic'
import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useMobileSyncStore } from '@/state/mobile-sync'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useNavigation } from 'expo-router'
import { useEffect, type PropsWithChildren } from 'react'
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type DrawerNavigation = { openDrawer: () => void }

type WorkspaceShellProps = {
  title?: string
  titleLeading?: React.ReactNode
  titleAccessory?: React.ReactNode
  titleAccessibilityLabel?: string
  onTitlePress?: () => void
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
  /** Optional compact metadata row used by session/workspace headers. */
  headerMeta?: React.ReactNode
  showMenu?: boolean
}

/**
 * Provides the shared safe-area and header frame for screens inside the root drawer.
 * @param children - Screen content rendered below the header.
 * @param title - Header title.
 * @param titleLeading - Optional compact element rendered before the title.
 * @param titleAccessory - Optional compact element rendered beside the title.
 * @param titleAccessibilityLabel - Screen-reader label for an interactive title.
 * @param onTitlePress - Optional action that makes the title row a native button.
 * @param leftAction - Optional replacement for the drawer menu button.
 * @param rightAction - Optional action rendered at the trailing edge.
 * @param headerMeta - Optional second-row metadata rendered below the top row.
 * @param showMenu - Whether the leading drawer menu is available.
 * @returns The shell frame.
 */
export function WorkspaceShell({
  children,
  title,
  titleLeading,
  titleAccessory,
  titleAccessibilityLabel,
  onTitlePress,
  leftAction,
  rightAction,
  headerMeta,
  showMenu = true,
}: PropsWithChildren<WorkspaceShellProps>): React.JSX.Element {
  const navigation = useNavigation<DrawerNavigation>()
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const entrance = useEntranceFade()
  const hasHeaderMeta = headerMeta !== undefined
  const menu = showMenu ? (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={message('common.openDrawer')}
      onPress={() => navigation.openDrawer()}
      hitSlop={8}
      style={({ pressed }) => [s.icon, pressed && s.pressed]}
    >
      <NativeIcon name="panel-left-outline" size={16} color={theme.colors.inkMuted} />
    </Pressable>
  ) : null
  const titleContent = (
    <View style={s.titleGroup}>
      {titleLeading ? <View style={s.titleLeading}>{titleLeading}</View> : null}
      <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={s.title}>
        {title ?? 'DeepSeek Harness'}
      </Text>
      {titleAccessory}
    </View>
  )
  return (
    <View style={[s.safe, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={s.root}>
        <View style={[s.header, { minHeight: workspaceHeaderMinHeight(hasHeaderMeta), paddingTop: insets.top }]}>
          <View style={s.headerTop}>
            {leftAction ?? menu}
            {onTitlePress === undefined ? (
              titleContent
            ) : (
              <Pressable
                android_ripple={{ borderless: false }}
                accessibilityLabel={titleAccessibilityLabel ?? title ?? 'DeepSeek Harness'}
                accessibilityRole="button"
                hitSlop={8}
                onPress={onTitlePress}
                style={({ pressed }) => [s.titleButton, pressed && s.pressed]}
              >
                {titleContent}
              </Pressable>
            )}
            <View style={s.right}>{rightAction}</View>
          </View>
          {hasHeaderMeta ? <View style={s.metaRow}>{headerMeta}</View> : null}
        </View>
        {/* Every screen keeps this bar, so a dropped stream is visible outside a
            conversation too: the lists on the workspace and settings screens would
            otherwise go stale with nothing on screen saying why. */}
        <OfflineBanner />
        <Animated.View style={[s.content, entrance, { paddingBottom: insets.bottom }]}>{children}</Animated.View>
      </View>
    </View>
  )
}
/**
 * Shows a reconnect bar while the event stream is down.
 *
 * A reconnect is a fresh stream with fresh subscriptions, which is the same action the
 * drawer already performs, so this bar reuses it rather than inventing a second path.
 *
 * @returns The bar, or nothing while the stream is healthy.
 */
function OfflineBanner(): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  const theme = useAppTheme()
  const status = useMobileSyncStore((state) => state.status)
  const connection = useConnectionStore((state) => state.connection)
  if (!shouldShowOfflineBar({ hasConnection: connection !== undefined, status })) return null
  return (
    <Pressable
      android_ripple={{ borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={message('conversation.reconnect')}
      onPress={() => useMobileSyncStore.getState().restartStream()}
      style={({ pressed }) => [s.offline, pressed && s.pressed]}
    >
      <NativeIcon name="warning-outline" size={13} color={theme.colors.warningText} />
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={s.offlineText}>
        {message('connect.offline')}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={s.offlineAction}>
        {message('common.reconnect')}
      </Text>
    </Pressable>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    offline: {
      alignItems: 'center',
      backgroundColor: theme.colors.warningSoft,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 6,
    },
    offlineText: { color: theme.colors.warningText, flexShrink: 1, fontSize: 12, lineHeight: 16 },
    offlineAction: { color: theme.colors.warningText, fontSize: 12, fontWeight: '600', marginLeft: 'auto' },
    root: { flex: 1 },
    header: { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
    // `ConversationRoot.module.css .header` pads `10px 28px 0 20px`; the phone
    // adds the status-bar inset above it. The desktop title row is 30 tall in a
    // 40 header; the native row keeps a 44 floor so the trailing control holds
    // its touch target.
    headerTop: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: theme.chrome.headerHeight,
      paddingLeft: 20,
      paddingRight: 28,
      paddingVertical: 0,
    },
    // The desktop's header icon button is 28pt square with the small radius
    // and secondary label colour. The 8pt hit slop around it keeps the iOS
    // 44pt touch target without making the drawn control larger.
    icon: {
      alignItems: 'center',
      borderRadius: theme.radius.sm,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    titleButton: { flex: 1, minWidth: 0 },
    titleGroup: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
    titleLeading: { alignItems: 'center', marginRight: 7 },
    // The Web header prints its breadcrumb and title at 14/500 on a 20px line
    // (ConversationRoot.module.css `.crumbs`).
    title: { color: theme.colors.ink, flexShrink: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },
    right: { alignItems: 'flex-end', minWidth: 28, maxWidth: '36%' },
    metaRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: theme.chrome.headerMetaHeight,
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    content: { flex: 1 },
    pressed: { opacity: 0.58 },
  })

/** `cubic-bezier(0.4, 0, 0.2, 1)`, the desktop `--ds-ease-in-out`, as a UI-thread worklet. */
const ENTRANCE_EASING = Easing.bezier(0.4, 0, 0.2, 1)

/**
 * Fade a screen in on mount so a route change reads as a transition rather than
 * a hard cut. The platform's reduced-motion setting skips the fade and shows
 * the screen at full opacity immediately.
 *
 * @returns An animated opacity value for the screen container.
 */
function useEntranceFade() {
  const theme = useAppTheme()
  const opacity = useSharedValue(0)
  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => true)
      .then((reduced) => {
        if (!active) return
        if (reduced) {
          opacity.value = 1
          return
        }
        // Reanimated evaluates its easing on the UI thread, so it has to be one of its
        // own worklet easings: the RN `Animated` bezier is a plain JS function and
        // throws "Tried to synchronously call a Remote Function" in a Release build.
        opacity.value = withTiming(1, { duration: theme.motion.base, easing: ENTRANCE_EASING })
      })
    return () => {
      active = false
      cancelAnimation(opacity)
    }
  }, [opacity, theme.motion.base])
  return useAnimatedStyle(() => ({ opacity: opacity.value }))
}
