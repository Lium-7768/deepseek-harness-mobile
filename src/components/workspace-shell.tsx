import { NativeIcon } from '@/components/native-icon'
import { workspaceHeaderMinHeight } from '@/components/workspace-shell-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useMotionEasing, useThemedStyles } from '@/theme/hooks'
import { useNavigation } from 'expo-router'
import { useEffect, useRef, type PropsWithChildren } from 'react'
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native'
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
        <Animated.View style={[s.content, { opacity: entrance, paddingBottom: insets.bottom }]}>
          {children}
        </Animated.View>
      </View>
    </View>
  )
}
const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
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

/**
 * Fade a screen in on mount so a route change reads as a transition rather than
 * a hard cut. The platform's reduced-motion setting skips the fade and shows
 * the screen at full opacity immediately.
 *
 * @returns An animated opacity value for the screen container.
 */
function useEntranceFade(): Animated.Value {
  const theme = useAppTheme()
  const easing = useMotionEasing()
  const opacity = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => true)
      .then((reduced) => {
        if (!active) return
        if (reduced) {
          opacity.setValue(1)
          return
        }
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.motion.base,
          easing,
          useNativeDriver: true,
        }).start()
      })
    return () => {
      active = false
      opacity.stopAnimation()
    }
  }, [opacity, easing, theme.motion.base])
  return opacity
}
