import { useMemo } from 'react'
import { SvgXml } from 'react-native-svg'
import { ICON_ARTWORK, ICON_MEDIUM_STROKE, ICON_REGULAR_STROKE, type IconArtwork, type IconGlyph } from './icon-artwork'

/**
 * Icon names this client renders.
 *
 * The names are the desktop client's glyph names, so a control that exists on
 * both clients resolves to one drawing rather than two hand-made lookalikes.
 */
export type NativeIconName = IconGlyph

/** Stroke weights offered by the desktop artwork. */
export type NativeIconWeight = 'regular' | 'medium'

/**
 * Renders one product icon.
 *
 * The SVG comes from the copied desktop artwork unchanged: only the colour is
 * substituted for `currentColor`, so geometry and stroke never drift between the
 * two clients. A glyph wider than it is tall keeps its box ratio.
 *
 * @param props - Glyph name, colour, rendered height, and optional weight.
 * @returns The icon as one SVG document.
 */
export function NativeIcon({
  name,
  color,
  size = 18,
  weight = 'regular',
}: {
  name: NativeIconName
  color: string
  size?: number
  weight?: NativeIconWeight
}): React.JSX.Element {
  const artwork: IconArtwork = ICON_ARTWORK[name]
  const xml = useMemo(() => {
    const stroke = weight === 'medium' ? ICON_MEDIUM_STROKE : ICON_REGULAR_STROKE
    return artwork.svg(stroke).replaceAll('currentColor', color)
  }, [artwork, color, weight])
  const [width, height] = artwork.aspect ?? [1, 1]
  return (
    <SvgXml
      accessibilityElementsHidden
      height={size * height}
      width={size * width}
      xml={xml}
    />
  )
}
