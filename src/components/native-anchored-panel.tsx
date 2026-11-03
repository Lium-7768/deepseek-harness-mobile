import { sheetGeometry } from './native-layout'
import { NativeIcon } from './native-icon'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useEffect, useState } from 'react'
import { Keyboard, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Style of the panel card every composer menu and detail panel wears. */
export function panelCardStyle(
  theme: AppTheme,
  padding: number,
): {
  borderRadius: number
  elevation: number
  padding: number
  shadowColor: string
  shadowOffset: { height: number; width: number }
  shadowOpacity: number
  shadowRadius: number
  backgroundColor: string
} {
  return {
    ...theme.elevation.sheet,
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    padding,
  }
}

/**
 * Renders one click-open panel above a dock trigger.
 *
 * The Web portals these panels above the trigger (`stat-dialog.module.css`,
 * `ContextMeter .panel`) with a 12px viewport margin. A phone has no room to
 * keep the whole composer visible behind a floating panel, so the panel takes
 * the same surface, radius, padding and type, and sits on a dismissable scrim
 * anchored to the bottom of the screen — the RN form of the same interaction.
 *
 * @param props - Whether the panel is open, how to close it, and its content.
 * @returns The panel, or `null` while closed.
 */
export function NativeAnchoredPanel({
  children,
  onClose,
  open,
}: {
  children: React.ReactNode
  onClose: () => void
  open: boolean
}): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const theme = useAppTheme()
  const [modalHeight, setModalHeight] = useState(height)
  // A sheet that owns a text field would otherwise open under the keyboard: its
  // modal window is its own surface, so the activity's adjustResize never moves
  // it. The anchor lifts by the reported keyboard height instead.
  const [keyboardTop, setKeyboardTop] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (!open) return
    setKeyboardTop(Keyboard.metrics()?.screenY)
    const show = Keyboard.addListener('keyboardDidShow', (event) => setKeyboardTop(event.endCoordinates.screenY))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardTop(undefined))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [open])
  const geometry = sheetGeometry(modalHeight, keyboardTop, insets.top, insets.bottom)
  if (!open) return null
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={s.viewport} onLayout={(event) => setModalHeight(event.nativeEvent.layout.height)}>
        <Pressable
          accessibilityLabel={message('common.close')}
          accessibilityRole="button"
          onPress={onClose}
          style={s.backdrop}
        />
        <View pointerEvents="box-none" style={[s.anchor, { paddingBottom: geometry.bottom }]}>
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={[s.content, { maxHeight: geometry.maxHeight }]}
          >
            <View style={s.chrome}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={message('common.close')}
                onPress={onClose}
                hitSlop={6}
                style={s.close}
              >
                <NativeIcon name="close-outline" size={18} color={theme.colors.inkMuted} />
              </Pressable>
            </View>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `stat-dialog.module.css .panel` / `ContextMeter .panel`: menu surface, 12px
    // radius, 16px padding (the meter keeps 12), prominent elevation.
    viewport: { flex: 1 },
    chrome: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8, minHeight: 32, flexShrink: 0 },
    close: { width: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
    backdrop: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, backgroundColor: theme.colors.panelScrim },
    anchor: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12 },
    content: {
      ...theme.elevation.sheet,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 640,
      flexShrink: 1,
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: theme.radius.xl,
      paddingTop: 4,
      overflow: 'hidden',
    },
  })
