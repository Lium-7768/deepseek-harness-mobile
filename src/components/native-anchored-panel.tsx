import { modelPopoverGeometry, sheetGeometry, type NativePanelAnchor } from '@/components/native-layout'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Keyboard, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Renders one click-open panel above a dock trigger.
 *
 * The Web portals these panels above the trigger (`stat-dialog.module.css`,
 * `ContextMeter .panel`) with a 12px viewport margin. A phone has no room to
 * keep the whole composer visible behind every detail surface, so ordinary
 * panels use a bottom sheet. Supplying an anchor ref places a compact popover
 * above that control, retaining the visible composer and a clear backdrop.
 *
 * @param props - Whether the panel is open, how to close it, and its content.
 * @returns The panel, or `null` while closed.
 */
export function NativeAnchoredPanel({
  children,
  onClose,
  open,
  anchorRef,
}: {
  children: React.ReactNode
  onClose: () => void
  open: boolean
  /** Optional trigger measured in the same window coordinate space as the Modal viewport. */
  anchorRef?: RefObject<View | null>
}): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const viewportRef = useRef<View>(null)
  const [modalWidth, setModalWidth] = useState(width)
  const [anchor, setAnchor] = useState<NativePanelAnchor>()
  const [measured, setMeasured] = useState(false)
  const [modalHeight, setModalHeight] = useState(height)
  const unobscuredHeight = useRef(height)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const measureAnchor = useCallback(() => {
    if (!anchorRef) return
    if (!anchorRef.current) {
      setAnchor(undefined)
      setMeasured(true)
      return
    }
    if (!viewportRef.current) return
    viewportRef.current.measureInWindow((viewportX, viewportY) => {
      anchorRef.current?.measureInWindow((x, y, width, height) => {
        setAnchor(width > 0 && height > 0 ? { x: x - viewportX, y: y - viewportY, width, height } : undefined)
        setMeasured(true)
      })
    })
  }, [anchorRef])
  useEffect(() => {
    if (open) measureAnchor()
    else {
      setAnchor(undefined)
      setMeasured(false)
    }
  }, [open, measureAnchor, keyboardHeight, width, height])
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
  const popover = anchorRef
    ? modelPopoverGeometry(modalWidth, modalHeight, insets.top, geometry.bottom, anchor)
    : undefined
  if (!open) return null
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible
      statusBarTranslucent
      navigationBarTranslucent
      onShow={measureAnchor}
    >
      <View
        ref={viewportRef}
        style={s.viewport}
        onLayout={(event) => {
          const measured = event.nativeEvent.layout.height
          if (!Keyboard.isVisible() && keyboardHeight === 0) unobscuredHeight.current = measured
          setModalHeight(measured)
          setModalWidth(event.nativeEvent.layout.width)
          measureAnchor()
        }}
      >
        <Pressable
          accessibilityLabel={message('common.close')}
          accessibilityRole="button"
          onPress={onClose}
          style={[s.backdrop, anchorRef && s.clearBackdrop]}
        />
        <View
          pointerEvents="box-none"
          style={
            popover
              ? [
                  s.popover,
                  {
                    left: popover.left,
                    bottom: popover.bottom,
                    width: popover.width,
                    opacity: measured ? 1 : 0,
                  },
                ]
              : [s.anchor, { paddingBottom: geometry.bottom }]
          }
        >
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={[s.content, popover && s.popoverContent, { maxHeight: popover?.maxHeight ?? geometry.maxHeight }]}
          >
            <View style={[s.clippedContent, popover && s.popoverClip]}>{children}</View>
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
    popover: { position: 'absolute' },
    clearBackdrop: { backgroundColor: 'transparent' },
    popoverContent: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xl,
    },
    popoverClip: { borderRadius: theme.radius.xl },
    content: {
      ...theme.elevation.sheet,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 640,
      flexShrink: 1,
      backgroundColor: theme.colors.surfaceRaised,
      // `stat-dialog .panel` / `ContextMeter .panel`: the sheet surface is r16.
      borderRadius: theme.radius.lg,
    },
    clippedContent: { flexShrink: 1, borderRadius: theme.radius.lg, overflow: 'hidden' },
  })
