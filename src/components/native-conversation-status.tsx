import { NativeBrandMark } from './native-brand-mark'
import { useConversationDisclosure } from './conversation-disclosure'
import { conversationRowKey } from './conversation-flow'
import { NativeFlowRow } from '@/components/native-flow-row'
import { NativeIcon } from '@/components/native-icon'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type ReasoningRow = Extract<NativeConversationRow, { kind: 'reasoning' }>
type RetryRow = Extract<NativeConversationRow, { kind: 'retry' }>
type TurnErrorRow = Extract<NativeConversationRow, { kind: 'turn-error' }>
type CommandRow = Extract<NativeConversationRow, { kind: 'command' }>
type CompactionRow = Extract<NativeConversationRow, { kind: 'compaction' }>

/**
 * Renders a desktop-style Think disclosure: a 24pt row reading `思考 · <first
 * line>`, opening the complete reasoning under the title.
 *
 * @param props.row - Durable assistant reasoning projection.
 * @returns Expandable native Think row.
 */
export function NativeReasoningRow({ row }: { row: ReasoningRow }): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const [expanded, toggleExpanded] = useConversationDisclosure(conversationRowKey(row))
  const summary = useMemo(() => row.text.trim().split('\n')[0] ?? '', [row.text])
  return (
    <NativeFlowRow
      accessibilityLabel={message('status.viewThink')}
      icon="think-outline"
      open={expanded}
      onToggle={toggleExpanded}
      summary={summary}
      title={message('status.think')}
    >
      <Text selectable style={s.disclosureBody}>
        {row.text}
      </Text>
    </NativeFlowRow>
  )
}

/**
 * Renders one durable desktop model-retry disclosure.
 *
 * The desktop prints the retry as a single tertiary line whose chevron follows
 * the text instead of leading it, with the delay and upstream failure behind it.
 *
 * @param props.row - Retry number, delay, and upstream failure projection.
 * @returns Expandable native retry row.
 */
export function NativeRetryRow({ row }: { row: RetryRow }): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [expanded, toggleExpanded] = useConversationDisclosure(conversationRowKey(row))
  const seconds = Math.max(1, Math.ceil(row.delayMs / 1_000))
  return (
    <View style={s.retry}>
      <Pressable
        hitSlop={8}
        accessibilityLabel={format('status.retryLabel', { attempt: row.retry })}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={toggleExpanded}
        style={({ pressed }) => [s.retryHeader, pressed && s.pressed]}
      >
        <Text numberOfLines={1} style={s.retryText}>
          {format('status.retryDetail', { attempt: row.retry, max: row.maxRetries, seconds })}
        </Text>
        <NativeIcon
          color={theme.colors.inkTertiary}
          name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={12}
        />
      </Pressable>
      {expanded ? (
        <View style={s.retryDetails}>
          <Text style={s.retryDetailLabel}>{message('status.retryDelay')}</Text>
          <Text selectable style={s.retryDetail}>
            {`${Math.round(row.delayMs)}ms`}
          </Text>
          <Text style={s.retryDetailLabel}>{message('status.failureReason')}</Text>
          <Text selectable style={s.retryDetail}>
            {row.failureMessage}
          </Text>
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
        <Text selectable style={s.errorMessage}>
          {row.message}
        </Text>
        {/* The desktop projection carries no code, so the phone prints it under the
            message instead of in the row, where it was squeezed to its wrap width. */}
        {row.code ? (
          <Text selectable style={s.errorCode}>
            {row.code}
          </Text>
        ) : null}
      </View>
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
  const [expanded, toggleExpanded] = useConversationDisclosure(conversationRowKey(row))
  return (
    <View style={s.command}>
      <Pressable
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          row.state === 'running'
            ? format('status.commandRun', { name: row.name })
            : format('status.commandName', { name: row.name })
        }
        accessibilityState={{ expanded }}
        onPress={toggleExpanded}
        style={({ pressed }) => [s.commandHeader, pressed && s.pressed]}
      >
        <NativeIcon name="code-outline" size={14} color={theme.colors.inkMuted} />
        <Text numberOfLines={1} selectable style={s.commandName}>
          {row.name}
        </Text>
        {row.state === 'running' ? <Text style={s.commandRunning}>{message('status.running')}</Text> : null}
        {row.state === 'error' ? <Text style={s.commandError}>{message('status.failed')}</Text> : null}
        <NativeIcon
          name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={16}
          color={theme.colors.inkFaint}
        />
      </Pressable>
      {expanded && row.text ? (
        <Text selectable style={s.commandBody}>
          {row.text}
        </Text>
      ) : null}
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
  const [expanded, toggleExpanded] = useConversationDisclosure(conversationRowKey(row))
  return (
    <View style={s.compaction}>
      <Pressable
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={message('status.viewCompaction')}
        accessibilityState={{ expanded }}
        onPress={toggleExpanded}
        style={({ pressed }) => [s.compactionHeader, pressed && s.pressed]}
      >
        <NativeIcon name="data-outline" size={14} color={theme.colors.inkMuted} />
        <Text style={s.compactionTitle}>{message('status.compacted')}</Text>
        <Text numberOfLines={1} selectable style={s.compactionSummary}>
          {row.summary || message('status.compactedBody')}
        </Text>
        <NativeIcon
          name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={16}
          color={theme.colors.inkFaint}
        />
      </Pressable>
      {expanded ? (
        <View style={s.compactionDetails}>
          {row.shadowedItemCount !== undefined ? (
            <Text style={s.compactionDetail}>{format('status.collapsedItems', { count: row.shadowedItemCount })}</Text>
          ) : null}
          {row.shadowedTokenCount !== undefined ? (
            <Text style={s.compactionDetail}>
              {format('status.collapsedTokens', { count: row.shadowedTokenCount })}
            </Text>
          ) : null}
          {row.summary ? (
            <Text selectable style={s.compactionBody}>
              {row.summary}
            </Text>
          ) : null}
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
      <NativeBrandMark size={14} />
      <Text style={s.turnStatusText}>{message('status.deepDiving')}</Text>
      {showClock ? <Text style={s.turnClock}>{formatDuration(elapsed)}</Text> : null}
    </View>
  )
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1_000)
  const minutes = Math.floor(seconds / 60)
  return minutes > 0
    ? format('status.durationMinutes', { minutes, seconds: seconds % 60 })
    : format('status.durationSeconds', { seconds })
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // The expanded Think body: markdown-like reading at the secondary size.
    disclosureBody: { color: theme.colors.ink, fontSize: 13, lineHeight: 20 },
    // `MessageItem .retryRow`: one 13/20 tertiary line, chevron 7pt after the text.
    retry: { gap: 4 },
    retryHeader: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 7, paddingVertical: 2 },
    retryText: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 13, lineHeight: 20 },
    retryDetails: {
      gap: 3,
      paddingLeft: 14,
    },
    retryDetailLabel: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 18 },
    retryDetail: { color: theme.colors.inkTertiary, fontSize: 13, lineHeight: 18 },
    error: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, paddingVertical: 2 },
    errorDot: { backgroundColor: theme.colors.danger, borderRadius: 5, height: 10, marginTop: 5, width: 10 },
    errorCopy: { flex: 1, gap: 2 },
    errorTitle: { color: theme.colors.danger, fontSize: 13, fontWeight: '600', lineHeight: 20 },
    errorMessage: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    errorCode: { color: theme.colors.inkTertiary, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    command: { gap: 4 },
    commandHeader: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 30, paddingHorizontal: 1 },
    commandName: { color: theme.colors.ink, flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    commandRunning: { color: theme.colors.accentText, fontSize: 11, lineHeight: 16 },
    commandError: { color: theme.colors.danger, fontSize: 11, lineHeight: 16 },
    commandBody: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      color: theme.colors.inkMuted,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      lineHeight: 16,
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
    maxTokensText: { color: theme.colors.warningText, flex: 1, fontSize: 13, lineHeight: 20 },
    compaction: { gap: 4 },
    compactionHeader: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 30, paddingHorizontal: 1 },
    compactionTitle: { color: theme.colors.inkTertiary, fontSize: 13, lineHeight: 24 },
    compactionSummary: { color: theme.colors.inkTertiary, flex: 1, fontSize: 13, lineHeight: 24 },
    compactionDetails: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      gap: 4,
      marginLeft: 20,
      padding: theme.spacing.sm,
    },
    compactionDetail: { color: theme.colors.inkTertiary, fontSize: 11, fontWeight: '500', lineHeight: 16 },
    compactionBody: { color: theme.colors.inkTertiary, fontSize: 13, lineHeight: 20 },
    turnStatus: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingVertical: 4 },
    turnStatusText: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 22 },
    turnClock: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 22 },
    pressed: { opacity: 0.62 },
  })
