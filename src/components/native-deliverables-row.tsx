import { tapFeedback } from '@/components/haptics'
import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeIcon } from '@/components/native-icon'
import { format, t as message } from '@/locale'
import { showSnackbar } from '@/state/snackbar'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

/**
 * Renders the files a turn produced as one row under it.
 *
 * The desktop prints a delivery card per presented file at the turn tail and opens
 * the file from it. A phone cannot open those files in place, so the row states the
 * count and the sheet lists every path with its description; a tap copies the path,
 * which is the only useful verb the phone has for a file on another machine.
 *
 * @param props - The turn's presented files.
 * @returns The row, or nothing when the turn produced none.
 */
export function NativeDeliverablesRow({
  files,
}: {
  files: readonly { path: string; description?: string }[]
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [open, setOpen] = useState(false)
  if (files.length === 0) return null
  const copy = (path: string): void => {
    void Clipboard.setStringAsync(path).then(() => {
      tapFeedback()
      showSnackbar(message('copy.pathCopied'))
    })
  }
  return (
    <>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={format('conversation.deliverables', { count: files.length })}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [s.row, pressed && s.pressed]}
      >
        <NativeIcon name="deliver-doc" size={15} color={theme.colors.inkMuted} />
        <Text style={s.label}>{format('conversation.deliverables', { count: files.length })}</Text>
        <NativeIcon name="chevron-right-outline" size={15} color={theme.colors.inkTertiary} />
      </Pressable>
      <NativeAnchoredPanel onClose={() => setOpen(false)} open={open}>
        <ScrollView contentContainerStyle={s.sheet}>
          {files.map((file) => (
            <Pressable
              android_ripple={{ borderless: false }}
              accessibilityLabel={format('conversation.copyDeliverable', { path: file.path })}
              accessibilityRole="button"
              key={file.path}
              onPress={() => copy(file.path)}
              style={({ pressed }) => [s.file, pressed && s.pressed]}
            >
              <Text numberOfLines={1} style={s.path}>
                {file.path.split('/').at(-1) ?? file.path}
              </Text>
              {file.description === undefined ? null : (
                <Text numberOfLines={2} style={s.description}>
                  {file.description}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </NativeAnchoredPanel>
    </>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 7,
      minHeight: 32,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 4,
    },
    label: { color: theme.colors.inkMuted, flex: 1, fontSize: 13, lineHeight: 20 },
    sheet: { gap: 2, paddingBottom: 8, paddingHorizontal: 4, paddingTop: 4 },
    file: { gap: 2, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8 },
    path: { color: theme.colors.ink, fontSize: 14, lineHeight: 20 },
    description: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18 },
    pressed: { opacity: 0.62 },
  })
