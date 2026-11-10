import { NativeIcon } from '@/components/native-icon'
import { format } from '@/locale'
import type { SharedEventItem } from '@/shared/dsh-presentation'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { StyleSheet, Text, View } from 'react-native'

export function ContextRows({ items }: { items: SharedEventItem[] }): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const names = Array.from(new Set(items.flatMap((item) => contextName(item.event))))
  if (!names.length) return null
  // One line, not one per source: this is bookkeeping above the transcript, and
  // a session that injected three files would otherwise push the first message
  // a third of a screen further down.
  const first = names[0] ?? ''
  const label =
    names.length === 1
      ? format('workbench.contextInjection', { name: first })
      : format('workbench.contextInjectionMore', { count: names.length, name: first })
  return (
    <View style={s.contextCompact}>
      <View style={s.contextCompactRow}>
        <NativeIcon name="deliver-doc" size={15} color={theme.colors.inkMuted} />
        <Text numberOfLines={1} style={s.contextCompactText}>
          {label}
        </Text>
      </View>
    </View>
  )
}

function contextName(event: Record<string, unknown>): string[] {
  const type = typeof event.type === 'string' ? event.type.toLowerCase() : ''
  if (!type.includes('context')) return []
  const source = [event.sourceName, event.source, event.filename, event.fileName].find(
    (value) => typeof value === 'string' && value.trim(),
  )
  if (typeof source !== 'string') return []
  const name = source.split(/[\\/]/).at(-1)?.trim() ?? ''
  return name && !isInternalContextName(name) ? [name] : []
}

function isInternalContextName(name: string): boolean {
  return /agents\.md|system|prompt|skill|internal|mobilegatewayok/i.test(name)
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    contextCompact: { gap: 8, marginTop: 2, paddingHorizontal: 16, paddingTop: 12 },
    contextCompactRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
    contextCompactText: { color: theme.colors.inkMuted, flex: 1, fontSize: 13, lineHeight: 20 },
  })
