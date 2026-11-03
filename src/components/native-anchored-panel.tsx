import { sheetGeometry } from '@/components/native-layout'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { useEffect, useRef, useState } from 'react'
import { Keyboard, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
  const [modalHeight, setModalHeight] = useState(height)
  const unobscuredHeight = useRef(height)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  useEffect(() => {
    if (!open) return
    setKeyboardHeight(Keyboard.metrics()?.height ?? 0)
    const update = (event: import('react-native').KeyboardEvent): void => setKeyboardHeight(event.endCoordinates.height)
    const show = Keyboard.addListener('keyboardDidShow', update)
    const change = Keyboard.addListener('keyboardWillChangeFrame', update)
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0))
    return () => {
      show.remove()
      change.remove()
      hide.remove()
    }
  }, [open])
  const geometry = sheetGeometry(modalHeight, keyboardHeight, insets.top, insets.bottom, unobscuredHeight.current)
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
      <View
        style={s.viewport}
        onLayout={(event) => {
          const measured = event.nativeEvent.layout.height
          if (!Keyboard.isVisible() && keyboardHeight === 0) unobscuredHeight.current = measured
          setModalHeight(measured)
        }}
      >
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
            <View style={s.clippedContent}>{children}</View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // One surface and shadow for menus and detail panels.
    viewport: { flex: 1 },
    backdrop: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, backgroundColor: theme.colors.panelScrim },
    anchor: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12 },
    content: {
      ...theme.elevation.sheet,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 640,
      flexShrink: 1,
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: theme.radius.md,
    },
    clippedContent: { flexShrink: 1, borderRadius: theme.radius.md, overflow: 'hidden' },
  })
