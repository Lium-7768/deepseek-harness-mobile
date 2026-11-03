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
 * Build one glyph's SVG document, reused across every instance that asks for the
 * same name, colour, and weight.
 *
 * The document is a pure function of those three values, and a conversation
 * mounts hundreds of icons that re-render on every streamed token, so rebuilding
 * the string per render repeated identical work.
 *
 * @param name - Glyph to draw.
 * @param color - Colour substituted for the artwork's `currentColor`.
 * @param weight - Stroke weight the artwork's path width follows.
 * @returns The SVG document for that combination.
 */
function iconXml(name: NativeIconName, color: string, weight: NativeIconWeight): string {
  const key = `${name}|${color}|${weight}`
  const cached = xmlCache.get(key)
  if (cached !== undefined) return cached
  const stroke = weight === 'medium' ? ICON_MEDIUM_STROKE : ICON_REGULAR_STROKE
  const built = ICON_ARTWORK[name].svg(stroke).replaceAll('currentColor', color)
  xmlCache.set(key, built)
  return built
}

/** Documents already built, keyed by glyph, colour, and weight. */
const xmlCache = new Map<string, string>()

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
  const xml = iconXml(name, color, weight)
  const [width, height] = artwork.aspect ?? [1, 1]
  return <SvgXml accessibilityElementsHidden height={size * height} width={size * width} xml={xml} />
}
