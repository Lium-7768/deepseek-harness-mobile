/** Layout uses available reading width, not just raw device width. */
export function usesStackedFields(width: number, fontScale: number): boolean {
  return width / Math.max(1, fontScale) < 360
}

export function composerLayout(
  width: number,
  fontScale: number,
): { compact: boolean; iconModel: boolean; inputMinHeight: number } {
  return {
    compact: width / Math.max(1, fontScale) < 460,
    iconModel: width / Math.max(1, fontScale) < 300,
    inputMinHeight: Math.ceil(24 * Math.max(1, fontScale) + 8),
  }
}

/** A resized Android modal already excludes the keyboard; never subtract that area twice. */
export function sheetGeometry(
  viewportHeight: number,
  keyboardTop: number | undefined,
  topInset: number,
  bottomInset: number,
): { bottom: number; maxHeight: number } {
  const overlap = keyboardTop === undefined ? 0 : Math.max(0, viewportHeight - keyboardTop)
  const bottom = overlap > 0 ? overlap + 8 : Math.max(bottomInset, 12)
  return { bottom, maxHeight: Math.max(0, viewportHeight - bottom - topInset - 12) }
}
