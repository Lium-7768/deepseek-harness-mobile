import type { PropsWithChildren } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
export interface ScreenProps extends PropsWithChildren {
  scroll?: boolean
}
export function Screen({ children, scroll = true }: ScreenProps): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </SafeAreaView>
  )
}
const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, gap: theme.spacing.md, padding: theme.spacing.lg },
  })
