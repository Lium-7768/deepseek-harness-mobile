import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { StyleSheet, Text, View } from 'react-native'
import { NativeActionButton } from './native-action-button'
import { NativeBrandMark } from './native-brand-mark'
import { NativeRunningRing } from './native-running-ring'

/** Keeps storage errors actionable before navigation or remote queries are mounted. */
export function StartupGate(): React.JSX.Element {
  const s = useThemedStyles(styles)
  const error = useConnectionStore((state) => state.initializationError)
  const retry = useConnectionStore((state) => state.initialize)
  const reconnect = useConnectionStore((state) => state.continueWithoutConnection)
  return (
    <View style={s.root}>
      <NativeBrandMark size={48} />
      {error ? (
        <>
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
          <NativeActionButton label={message('common.reload')} icon="refresh-outline" onPress={() => void retry()} />
          <NativeActionButton
            label={message('connect.title')}
            icon="link-outline"
            variant="secondary"
            onPress={reconnect}
          />
        </>
      ) : (
        // The branded arc, not the platform spinner: the first paint is the one
        // moment the app has no content of its own to show.
        <NativeRunningRing size={22} />
      )}
    </View>
  )
}

const styles = (theme: AppTheme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 20,
    },
    error: { maxWidth: 360, color: theme.colors.inkMuted, fontSize: 15, lineHeight: 24, textAlign: 'center' },
  })
