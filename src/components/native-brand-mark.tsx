import { useAppTheme } from '@/theme/hooks'
import { Image, StyleSheet } from 'react-native'
import whaleMark from '../../assets/whale-mark.png'

/** Renders the existing DeepSeek whale mark without adding a second icon family.
 * @param size - Square display size in pixels.
 * @returns The decorative brand mark.
 */
export function NativeBrandMark({ size = 28 }: { size?: number }): React.JSX.Element {
  const theme = useAppTheme()
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={whaleMark}
      style={[styles.mark, { height: size, width: size, tintColor: theme.colors.brand }]}
    />
  )
}

const styles = StyleSheet.create({ mark: { resizeMode: 'contain' } })
