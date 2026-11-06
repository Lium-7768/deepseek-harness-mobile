import { NativeIcon } from '@/components/native-icon'
import { t as message } from '@/locale'
import { SNACKBAR_VISIBLE_MS, useSnackbarStore } from '@/state/snackbar'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Prints the current transient message above the safe-area inset.
 *
 * It sits over the content rather than pushing it, so nothing reflows while a confirmation
 * appears, and it ignores touches outside its own pill so the conversation stays usable.
 *
 * @returns The message pill, or nothing while the queue is empty.
 */
export function NativeSnackbar(): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const current = useSnackbarStore((state) => state.current)
  const dismiss = useSnackbarStore((state) => state.dismiss)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (current === undefined) return undefined
    void AccessibilityInfo.announceForAccessibility(current.text)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      dismiss(current.id)
    }, SNACKBAR_VISIBLE_MS)
    return () => {
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = null
    }
  }, [current, dismiss])

  if (current === undefined) return null
  return (
    <View pointerEvents="box-none" style={[s.host, { bottom: insets.bottom + 76 }]}>
      <View style={s.pill}>
        <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={s.text}>
          {current.text}
        </Text>
        {current.undo === undefined ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={message('common.undo')}
            hitSlop={10}
            onPress={() => {
              current.undo?.()
              dismiss(current.id)
            }}
            style={({ pressed }) => [s.undo, pressed && s.pressed]}
          >
            <NativeIcon name="refresh-outline" size={14} color={theme.colors.accent} />
            <Text style={s.undoText}>{message('common.undo')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const makeStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    host: { alignItems: 'center', left: 0, position: 'absolute', right: 0 },
    pill: {
      alignItems: 'center',
      backgroundColor: theme.colors.floating,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 12,
      maxWidth: '92%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      ...theme.elevation.card,
    },
    text: { color: theme.colors.ink, flexShrink: 1, fontSize: 13, lineHeight: 18 },
    undo: { alignItems: 'center', flexDirection: 'row', gap: 4 },
    undoText: { color: theme.colors.accent, fontSize: 13, fontWeight: '500' },
    pressed: { opacity: 0.6 },
  })
