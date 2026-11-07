import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { Component, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { NativeActionButton } from './native-action-button'
import { NativeBrandMark } from './native-brand-mark'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Keeps one bad render from taking the whole app down.
 *
 * A transcript row, a markdown block or a projection that throws would otherwise
 * unmount the navigation tree and leave a white screen with no way back. The boundary
 * shows the failure with a reload that remounts the tree in place; the desktop remains
 * the source of truth, so nothing the reader had done is lost.
 *
 * Only render-phase errors are caught. Event, timer and promise failures need their
 * own handlers, which the stores and mutations already carry.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error): void {
    // The fallback already names the failure; the message stays in the log for diagnosis.
    console.error('[app]', error)
  }

  private retry = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (this.state.error === null) return this.props.children
    return <CrashFallback onRetry={this.retry} />
  }
}

function CrashFallback({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  useAppTheme()
  const s = useThemedStyles(styles)
  return (
    <View style={s.root}>
      <NativeBrandMark size={48} />
      <Text accessibilityRole="alert" style={s.title}>
        {message('errors.crashTitle')}
      </Text>
      <Text style={s.body}>{message('errors.crashBody')}</Text>
      <NativeActionButton label={message('common.reload')} icon="refresh-outline" onPress={onRetry} />
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
      gap: 16,
    },
    title: { color: theme.colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '600' },
    body: { maxWidth: 360, color: theme.colors.inkMuted, fontSize: 15, lineHeight: 24, textAlign: 'center' },
  })
