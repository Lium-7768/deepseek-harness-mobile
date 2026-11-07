import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { warnFeedback } from './haptics'

type Props = {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A destructive step's confirmation, as a bottom sheet.
 *
 * `Alert.alert` cannot carry the workspace or session name with its real typography,
 * cannot be given the app's own buttons, and looks unlike every other surface in the
 * client. This sheet keeps the title and body the reader must weigh, and destructive
 * confirms buzz once on confirmation the way the drawer already does.
 *
 * Plain failures keep using `Alert.alert`: a sheet for every error would hide the
 * transcript behind chrome that only restates it.
 *
 * @param props - Copy, labels and the confirm/cancel callbacks.
 * @returns The sheet, or nothing while closed.
 */
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = message('common.cancel'),
  onConfirm,
  onCancel,
}: Props): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  if (!open) return null
  return (
    <Modal animationType="fade" onRequestClose={onCancel} statusBarTranslucent transparent visible={open}>
      <View style={s.root}>
        <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onCancel} style={s.backdrop} />
        <View style={[s.card, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text accessibilityRole="header" style={s.title}>
            {title}
          </Text>
          <Text style={s.body}>{body}</Text>
          <View style={s.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              android_ripple={{ borderless: false }}
              onPress={onCancel}
              style={({ pressed }) => [s.cancel, pressed && s.pressed]}
            >
              <Text style={s.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              android_ripple={{ borderless: false }}
              onPress={() => {
                warnFeedback()
                onConfirm()
              }}
              style={({ pressed }) => [s.confirm, pressed && s.pressed]}
            >
              <Text style={s.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.scrim },
    card: {
      backgroundColor: theme.colors.surfaceRaised,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    title: { color: theme.colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '600' },
    body: { color: theme.colors.inkMuted, fontSize: 14, lineHeight: 22 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    cancel: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 18,
    },
    cancelText: { color: theme.colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '500' },
    confirm: {
      alignItems: 'center',
      backgroundColor: theme.colors.danger,
      borderRadius: theme.radius.pill,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 18,
    },
    confirmText: { color: theme.colors.textOnAccent, fontSize: 14, lineHeight: 20, fontWeight: '600' },
    pressed: { opacity: 0.7 },
  })
