/** Effective reading-width breakpoints and shared native control metrics, in points. */
const FIELD_STACK_WIDTH = 360
const COMPOSER_COMPACT_WIDTH = 460
const MODEL_ICON_WIDTH = 300
const INPUT_LINE_HEIGHT = 24
const INPUT_VERTICAL_PADDING = 8
const PANEL_GUTTER = 12
const KEYBOARD_GAP = 8

export type NativePanelAnchor = { x: number; y: number; width: number; height: number }

/** Positions a bounded card above its trigger, using measurements within the Modal viewport. */
export function modelPopoverGeometry(
  viewportWidth: number,
  viewportHeight: number,
  topInset: number,
  bottomClearance: number,
  anchor: NativePanelAnchor | undefined,
): { left: number; bottom: number; width: number; maxHeight: number } {
  const width = Math.max(0, Math.min(380, viewportWidth - PANEL_GUTTER * 2))
  const availableTop = topInset + PANEL_GUTTER
  const triggerTop = Math.min(anchor?.y ?? viewportHeight, viewportHeight - bottomClearance)
  const roomAbove = triggerTop - KEYBOARD_GAP - availableTop
  const bottom = anchor && roomAbove >= 160 ? viewportHeight - triggerTop + KEYBOARD_GAP : bottomClearance
  return {
    left: Math.max(
      PANEL_GUTTER,
      Math.min(
        viewportWidth - width - PANEL_GUTTER,
        anchor ? anchor.x + anchor.width - width : (viewportWidth - width) / 2,
      ),
    ),
    bottom,
    width,
    maxHeight: Math.max(0, viewportHeight - bottom - availableTop),
  }
}

/** @returns Whether enlarged text leaves too little reading width for side-by-side fields. */
export function usesStackedFields(width: number, fontScale: number): boolean {
  return width / Math.max(1, fontScale) < FIELD_STACK_WIDTH
}

/** @param width Available window width. @param fontScale Native text scale. @returns Toolbar modes and one readable input line. */
export function composerLayout(
  width: number,
  fontScale: number,
): { compact: boolean; iconModel: boolean; inputMinHeight: number } {
  return {
    compact: width / Math.max(1, fontScale) < COMPOSER_COMPACT_WIDTH,
    iconModel: width / Math.max(1, fontScale) < MODEL_ICON_WIDTH,
    inputMinHeight: Math.ceil(INPUT_LINE_HEIGHT * Math.max(1, fontScale) + INPUT_VERTICAL_PADDING),
  }
}

/**
 * Uses lengths from the same Modal, so screen/window origins cannot affect the calculation.
 * @param viewportHeight Current modal height, possibly already resized by Android.
 * @param keyboardHeight Keyboard end-frame height; zero while hidden.
 * @param topInset Top safe area.
 * @param bottomInset Bottom safe area while the keyboard is absent.
 * @param unobscuredHeight This Modal's last measured height without the keyboard.
 * @returns Bottom clearance and scrollable content budget, in points.
 */
export function sheetGeometry(
  viewportHeight: number,
  keyboardHeight: number,
  topInset: number,
  bottomInset: number,
  unobscuredHeight = viewportHeight,
): { bottom: number; maxHeight: number } {
  const resizedAway = Math.max(0, unobscuredHeight - viewportHeight)
  const overlap = Math.max(0, keyboardHeight - resizedAway)
  const bottom = overlap > 0 ? overlap + KEYBOARD_GAP : Math.max(bottomInset, PANEL_GUTTER)
  return { bottom, maxHeight: Math.max(0, viewportHeight - bottom - topInset - PANEL_GUTTER) }
}
