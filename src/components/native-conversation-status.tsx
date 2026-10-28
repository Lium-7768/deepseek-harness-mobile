import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { NativeIcon } from '@/components/native-icon'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { format, t as message } from '@/locale'

type ReasoningRow = Extract<NativeConversationRow, { kind: 'reasoning' }>
type RetryRow = Extract<NativeConversationRow, { kind: 'retry' }>
type TurnErrorRow = Extract<NativeConversationRow, { kind: 'turn-error' }>
type CommandRow = Extract<NativeConversationRow, { kind: 'command' }>
type CompactionRow = Extract<NativeConversationRow, { kind: 'compaction' }>

/**
 * Renders a desktop-style Think disclosure with its first line visible by default.
 *
 * @param props.row - Durable assistant reasoning projection.
 * @returns Expandable native Think row.
 */
export function NativeReasoningRow({ row }: { row: ReasoningRow }): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [expanded, setExpanded] = useState(false)
  const summary = useMemo(() => row.text.trim().split('\n')[0] ?? '', [row.text])
  return (
    <View style={s.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={message('status.viewThink')}
        accessibilityState={{ expanded }}
        // The row is 24pt to match Pocket's tightened spacing; hitSlop restores
        // the 44pt touch target the platform requires.
        hitSlop={10}
        onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => [s.disclosureHeader, pressed && s.pressed]}
      >
        <NativeIcon name="think-outline" size={15} color={theme.colors.inkMuted} />
        <Text style={s.disclosureTitle}>Think</Text>
        <Text style={s.separator}>·</Text>
        <Text numberOfLines={1} style={s.disclosureSummary}>
          {summary}
        </Text>
        <NativeIcon name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={15} color={theme.colors.inkFaint} />
      </Pressable>
      {expanded ? <Text selectable style={s.disclosureBody}>{row.text}</Text> : null}
    </View>
  )
}

/**
 * Renders one durable desktop model-retry disclosure.
 *
 * @param props.row - Retry number, delay, and upstream failure projection.
 * @returns Expandable native retry row.
 */
export function NativeRetryRow({ row }: { row: RetryRow }): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [expanded, setExpanded] = useState(false)
  const seconds = Math.max(1, Math.ceil(row.delayMs / 1_000))
  return (
    <View style={s.retry}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={format('status.retryLabel', { attempt: row.retry })}
        accessibilityState={{ expanded }}
        hitSlop={10}
        onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => [s.retryHeader, pressed && s.pressed]}
      >
        <NativeIcon name="refresh-outline" size={14} color={theme.colors.inkMuted} />
        <Text style={s.retryText}>{format('status.retryDetail', { attempt: row.retry, max: row.maxRetries, seconds })}</Text>
        <NativeIcon name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={15} color={theme.colors.inkFaint} />
      </Pressable>
      {expanded ? (
        <View style={s.retryDetails}>
          <Text style={s.retryDetailLabel}>{message('status.retryDelay')}</Text>
          <Text style={s.retryDetail}>{`${Math.round(row.delayMs)}ms`}</Text>
          <Text style={s.retryDetailLabel}>{message('status.failureReason')}</Text>
          <Text selectable style={s.retryDetail}>{row.failureMessage}</Text>
        </View>
      ) : null}
    </View>
  )
}

/**
 * Renders a durable turn-level error without converting it to assistant prose.
 *
 * @param props.row - Desktop turn error projection.
 * @returns Native turn error notice.
 */
export function NativeTurnErrorRow({ row }: { row: TurnErrorRow }): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  return (
    <View accessibilityRole="alert" style={s.error}>
      <View style={s.errorDot} />
      <View style={s.errorCopy}>
        <Text style={s.errorTitle}>{message('status.turnFailed')}</Text>
        <Text style={s.errorMessage}>{row.message}</Text>
      </View>
      {row.code ? <Text selectable style={s.errorCode}>{row.code}</Text> : null}
    </View>
  )
}

/**
 * Renders a durable command invocation as an expandable row.
 *
 * @param props.row - Desktop command/run + command/done projection.
 * @returns Native command row.
 */
export function NativeCommandRow({ row }: { row: CommandRow }): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [expanded, setExpanded] = useState(false)
  return (
    <View style={s.command}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={row.state === 'running' ? format('status.commandRun', { name: row.name }) : format('status.commandName', { name: row.name })}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => [s.commandHeader, pressed && s.pressed]}
      >
        <NativeIcon name="code-outline" size={14} color={theme.colors.inkMuted} />
        <Text numberOfLines={1} style={s.commandName}>{row.name}</Text>
        {row.state === 'running' ? <Text style={s.commandRunning}>{message('status.running')}</Text> : null}
        {row.state === 'error' ? <Text style={s.commandError}>{message('status.failed')}</Text> : null}
        <NativeIcon name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={15} color={theme.colors.inkFaint} />
      </Pressable>
      {expanded && row.text ? <Text selectable style={s.commandBody}>{row.text}</Text> : null}
    </View>
  )
}

/**
 * Renders a durable max-tokens turn boundary as an informative notice.
 *
 * @param props.row - Desktop turn/end max-tokens projection.
 * @returns Native max-tokens notice.
 */
export function NativeTurnMaxTokensRow(): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.maxTokens}>
      <NativeIcon name="warning-triangle-outline" size={14} color={theme.colors.warningText} />
      <Text style={s.maxTokensText}>{message('status.maxTokensNote')}</Text>
    </View>
  )
}

/**
 * Renders a durable compaction checkpoint summarizing shadowed history.
 *
 * @param props.row - Desktop compaction/summary projection.
 * @returns Native compaction notice.
 */
export function NativeCompactionRow({ row }: { row: CompactionRow }): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [expanded, setExpanded] = useState(false)
  return (
    <View style={s.compaction}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={message('status.viewCompaction')}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => [s.compactionHeader, pressed && s.pressed]}
      >
        <NativeIcon name="data-outline" size={14} color={theme.colors.inkMuted} />
        <Text style={s.compactionTitle}>{message('status.compacted')}</Text>
        <Text numberOfLines={1} style={s.compactionSummary}>
          {row.summary || message('status.compactedBody')}
        </Text>
        <NativeIcon name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={15} color={theme.colors.inkFaint} />
      </Pressable>
      {expanded ? (
        <View style={s.compactionDetails}>
          {row.shadowedItemCount !== undefined ? (
            <Text style={s.compactionDetail}>{format('status.collapsedItems', { count: row.shadowedItemCount })}</Text>
          ) : null}
          {row.shadowedTokenCount !== undefined ? (
            <Text style={s.compactionDetail}>{format('status.collapsedTokens', { count: row.shadowedTokenCount })}</Text>
          ) : null}
          {row.summary ? <Text selectable style={s.compactionBody}>{row.summary}</Text> : null}
        </View>
      ) : null}
    </View>
  )
}

/**
 * Mirrors the desktop running-turn footer outside Markdown and tool rows.
 *
 * @param props.startedAt - Durable `turn/start` time when available.
 * @returns Native live turn status.
 */
export function NativeTurnStatus({ startedAt }: { startedAt?: number }): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const [mountedAt] = useState(() => Date.now())
  const anchor = startedAt ?? mountedAt
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - anchor))
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.max(0, Date.now() - anchor)), 1_000)
    return () => clearInterval(timer)
  }, [anchor])
  const showClock = elapsed >= 15_000
  return (
    <View accessibilityLiveRegion="polite" style={s.turnStatus}>
      <Text style={s.turnStatusText}>Deep diving...</Text>
      {showClock ? <Text style={s.turnClock}>{formatDuration(elapsed)}</Text> : null}
    </View>
  )
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1_000)
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? format('status.durationMinutes', { minutes, seconds: seconds % 60 }) : format('status.durationSeconds', { seconds })
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    disclosure: { gap: 4, marginBottom: 4 },
    // Pocket trims a disclosure row to 24pt: the desktop spacing reads as a gap on a phone.
    disclosureHeader: { alignItems: 'center', flexDirection: 'row', gap: 5, minHeight: 24, paddingHorizontal: 1 },
    disclosureTitle: { color: theme.colors.inkMuted, fontSize: 12 },
    separator: { color: theme.colors.inkFaint, fontSize: 12 },
    disclosureSummary: { color: theme.colors.inkMuted, flex: 1, fontSize: 12 },
    disclosureBody: { color: theme.colors.ink, fontSize: 13, lineHeight: 20, paddingHorizontal: 20, paddingVertical: 6 },
    retry: { gap: 4 },
    retryHeader: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 24, paddingHorizontal: 1 },
    retryText: { color: theme.colors.inkMuted, flex: 1, fontSize: 12 },
    retryDetails: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      gap: 3,
      marginLeft: 20,
      padding: theme.spacing.sm,
    },
    retryDetailLabel: { color: theme.colors.inkFaint, fontSize: 10, fontWeight: '700' },
    retryDetail: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18 },
    error: { alignItems: 'flex-start', backgroundColor: theme.colors.dangerSoft, borderRadius: theme.radius.control, flexDirection: 'row', gap: 8, padding: theme.spacing.sm },
    errorDot: { backgroundColor: theme.colors.danger, borderRadius: 4, height: 8, marginTop: 5, width: 8 },
    errorCopy: { flex: 1, gap: 2 },
    errorTitle: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    errorMessage: { color: theme.colors.danger, fontSize: 12, lineHeight: 18 },
    errorCode: { color: theme.colors.danger, fontFamily: 'Menlo', fontSize: 10 },
    command: { gap: 4 },
    commandHeader: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 30, paddingHorizontal: 1 },
    commandName: { color: theme.colors.ink, flex: 1, fontSize: 12, fontWeight: '600' },
    commandRunning: { color: theme.colors.accentText, fontSize: 11 },
    commandError: { color: theme.colors.danger, fontSize: 11 },
    commandBody: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      color: theme.colors.inkMuted,
      fontFamily: 'Menlo',
      fontSize: 12,
      lineHeight: 18,
      marginLeft: 20,
      padding: theme.spacing.sm,
    },
    maxTokens: {
      alignItems: 'center',
      backgroundColor: theme.colors.warningSoft,
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      gap: 6,
      padding: theme.spacing.sm,
    },
    maxTokensText: { color: theme.colors.warningText, flex: 1, fontSize: 12, lineHeight: 18 },
    compaction: { gap: 4 },
    compactionHeader: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 30, paddingHorizontal: 1 },
    compactionTitle: { color: theme.colors.inkMuted, fontSize: 12 },
    compactionSummary: { color: theme.colors.inkMuted, flex: 1, fontSize: 12 },
    compactionDetails: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      gap: 4,
      marginLeft: 20,
      padding: theme.spacing.sm,
    },
    compactionDetail: { color: theme.colors.inkFaint, fontSize: 10, fontWeight: '700' },
    compactionBody: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18 },
    turnStatus: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingVertical: 4 },
    turnStatusText: { color: theme.colors.accentText, fontSize: 13, fontWeight: '600' },
    turnClock: { color: theme.colors.inkMuted, fontSize: 12 },
    pressed: { opacity: 0.62 },
  })
