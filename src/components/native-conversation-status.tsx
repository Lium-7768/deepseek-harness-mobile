import { useConversationDisclosure } from './conversation-disclosure'
import { conversationRowKey } from './conversation-flow'
import { NativeFlowRow } from '@/components/native-flow-row'
import { NativeMarkdown } from '@/components/native-markdown'
import { isHiddenReasoning, reasoningSummary, reasoningText } from '@/components/reasoning-text'
import { NativeIcon } from '@/components/native-icon'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

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
export function NativeReasoningRow({
  row,
  settledReasoningPreview = true,
}: {
  row: ReasoningRow
  /** Matches desktop `ChatPresentationPolicy.settledReasoningPreview` (`false` in compact mode). */
  settledReasoningPreview?: boolean
}): React.JSX.Element | null {
  const [expanded, toggleExpanded] = useConversationDisclosure(conversationRowKey(row))
  const displayText = useMemo(() => reasoningText(row.text), [row.text])
  const hidden = useMemo(() => isHiddenReasoning(row.text), [row.text])
  const running = row.running === true
  const summary = useMemo(() => reasoningSummary(displayText, running), [displayText, running])
  if (hidden || displayText.trim() === '') return null
  const visibleSummary = running || settledReasoningPreview ? summary : undefined
  return (
    <NativeFlowRow
      accessibilityLabel={message('status.viewThink')}
      icon="think-outline"
      keepContentWhenOpen={false}
      open={expanded}
      onToggle={toggleExpanded}
      summary={visibleSummary}
      title={message('status.think')}
    >
      <NativeMarkdown markdown={displayText} variant="compact" />
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
        android_ripple={{ borderless: false }}
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

function firstNonEmptyLine(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed !== '') return trimmed
  }
  return text.trim()
}

/**
 * Renders a durable command invocation matching desktop `GenericCommandCard`:
 * a 24pt `NativeFlowRow` with leading icon swap, dot separator, status/output
 * summary, and a bordered monospace scrollport for output text.
 *
 * @param props.row - Desktop command/run + command/done projection.
 * @returns Native command row.
 */
export function NativeCommandRow({ row }: { row: CommandRow }): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const [expanded, toggleExpanded] = useConversationDisclosure(conversationRowKey(row))
  const title = row.name.trim() !== '' ? row.name : message('status.commandTitle')
  const body = row.text !== undefined && row.text.trim() !== '' ? row.text : undefined
  const isError = row.state === 'error'
  const summary =
    row.state === 'running'
      ? message('status.commandRunning')
      : body !== undefined
        ? firstNonEmptyLine(body)
        : isError
          ? message('status.commandFailed')
          : message('status.commandDone')
  return (
    <NativeFlowRow
      accessibilityLabel={
        row.state === 'running'
          ? format('status.commandRun', { name: title })
          : format('status.commandName', { name: title })
      }
      expandable={body !== undefined}
      icon="code-outline"
      keepContentWhenOpen
      onToggle={toggleExpanded}
      open={expanded && body !== undefined}
      summary={summary}
      title={title}
      tone={isError ? 'danger' : 'tertiary'}
    >
      {body !== undefined ? (
        <ScrollView nestedScrollEnabled style={s.commandBodyScroll} contentContainerStyle={s.commandBodyContent}>
          <Text selectable style={[s.commandBodyText, isError && s.commandBodyError]}>
            {body}
          </Text>
        </ScrollView>
      ) : undefined}
    </NativeFlowRow>
  )
}

/**
 * Renders a durable max-tokens turn boundary matching desktop `TurnMaxTokensItem`:
 * a 10pt warning dot, bold warning title, and muted continuation hint inline.
 *
 * @returns Native max-tokens notice.
 */
export function NativeTurnMaxTokensRow(): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.error}>
      <View style={s.warningDot} />
      <View style={s.errorCopy}>
        <Text selectable style={s.errorMessage}>
          <Text style={s.maxTokensTitle}>{message('status.maxTokensTitle')}</Text> {message('status.maxTokensHint')}
        </Text>
      </View>
    </View>
  )
}

/**
 * Renders a durable compaction checkpoint matching desktop `CompactionItem`:
 * a 24pt `NativeFlowRow` with leading icon swap, dot separator, shadowed item
 * and token counts, and an indented compact-Markdown summary body.
 *
 * @param props.row - Desktop compaction/summary projection.
 * @returns Native compaction notice.
 */
export function NativeCompactionRow({ row }: { row: CompactionRow }): React.JSX.Element {
  const [expanded, toggleExpanded] = useConversationDisclosure(conversationRowKey(row))
  const expandable = row.summary.trim() !== ''
  const summary =
    row.shadowedItemCount !== undefined && row.shadowedTokenCount !== undefined
      ? format('status.compactedSummary', { items: row.shadowedItemCount, tokens: row.shadowedTokenCount })
      : expandable
        ? message('status.compactedExpand')
        : message('status.compactedUnavailable')
  return (
    <NativeFlowRow
      accessibilityLabel={message('status.viewCompaction')}
      expandable={expandable}
      icon="data-outline"
      keepContentWhenOpen
      onToggle={toggleExpanded}
      open={expanded && expandable}
      summary={summary}
      title={message('status.compacted')}
    >
      {expandable ? <NativeMarkdown markdown={row.summary} variant="compact" /> : undefined}
    </NativeFlowRow>
  )
}

/**
 * Mirrors the desktop running-turn footer outside Markdown and tool rows.
 *
 * @param props.startedAt - Durable `turn/start` time when available.
 * @param props.showDivider - Draws desktop `ChatView .runningDivider` above the status when output precedes it.
 * @returns Native live turn status.
 */
export function NativeTurnStatus({
  startedAt,
  showDivider = false,
}: {
  startedAt?: number
  showDivider?: boolean
}): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const [mountedAt] = useState(() => Date.now())
  const anchor = startedAt ?? mountedAt
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - anchor))
  useEffect(() => {
    setElapsed(Math.max(0, Date.now() - anchor))
    const timer = setInterval(() => setElapsed(Math.max(0, Date.now() - anchor)), 1_000)
    return () => clearInterval(timer)
  }, [anchor])
  const label =
    startedAt === undefined
      ? message('status.deepDiving')
      : format('status.deepDivingFor', { duration: formatDuration(Math.max(1_000, elapsed)) })
  return (
    <View style={s.turnStatusWrap}>
      {showDivider ? <View style={s.turnStatusDivider} /> : null}
      <View accessibilityLiveRegion="polite" style={s.turnStatus}>
        <NativeIcon name="whale-tail" size={14} color={s.turnStatusText.color} />
        {/* One line, whatever the clock says: a wrapped duration changes the footer's
            height once a minute, and the footer sits inside the scroll view. */}
        <Text numberOfLines={1} style={s.turnStatusText}>
          {label}
        </Text>
      </View>
    </View>
  )
}

/**
 * Formats a running Turn's elapsed time the way the desktop formats it: milliseconds
 * under a second, seconds under a minute, then minutes and seconds.
 *
 * @param milliseconds - Elapsed time since the Turn started.
 * @returns The localized duration.
 */
export function formatDurationLabel(milliseconds: number): string {
  return formatDurationLabel0(milliseconds)
}

function formatDurationLabel0(milliseconds: number): string {
  // The desktop prints `duration.milliseconds` below a second; without it the first
  // second of a Turn reads as `0秒`.
  if (milliseconds < 1_000) return format('status.durationMilliseconds', { milliseconds })
  const seconds = Math.floor(milliseconds / 1_000)
  const minutes = Math.floor(seconds / 60)
  return minutes > 0
    ? format('status.durationMinutes', { minutes, seconds: seconds % 60 })
    : format('status.durationSeconds', { seconds })
}

const formatDuration = formatDurationLabel

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
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
    warningDot: { backgroundColor: theme.colors.warning, borderRadius: 5, height: 10, marginTop: 5, width: 10 },
    errorCopy: { flex: 1, gap: 2 },
    errorTitle: { color: theme.colors.danger, fontSize: 13, fontWeight: '600', lineHeight: 20 },
    maxTokensTitle: { color: theme.colors.warningText, fontSize: 13, fontWeight: '600', lineHeight: 20 },
    errorMessage: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    errorCode: { color: theme.colors.inkTertiary, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    // `GenericCommandCard .body`: bordered code-block scrollport capped at 260pt.
    commandBodyScroll: {
      backgroundColor: theme.colors.codeBackground,
      borderColor: theme.colors.borderHairline,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      maxHeight: 260,
    },
    commandBodyContent: { paddingHorizontal: 16, paddingVertical: 12 },
    commandBodyText: { color: theme.colors.ink, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    commandBodyError: { color: theme.colors.danger },
    // `ChatView .running` + `.runningDivider`: 12/22 tabular deep-diving label on a 28pt row.
    turnStatusWrap: { gap: 8 },
    turnStatusDivider: { backgroundColor: theme.colors.borderHairline, height: StyleSheet.hairlineWidth },
    turnStatus: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 28 },
    turnStatusText: {
      color: theme.colors.inkDeepDiving,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
      lineHeight: 22,
    },
    pressed: { opacity: 0.62 },
  })
