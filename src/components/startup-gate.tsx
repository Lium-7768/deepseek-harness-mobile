import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { NativeActionButton } from './native-action-button'
import { NativeBrandMark } from './native-brand-mark'

/** Keeps storage errors actionable before navigation or remote queries are mounted. */
export function StartupGate(): React.JSX.Element {
  const theme = useAppTheme()
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
        <ActivityIndicator color={theme.colors.inkMuted} />
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
