import { useConversationDisclosure } from './conversation-disclosure'
import { conversationRowKey } from './conversation-flow'
import { compactJson, parseJsonPayload, prettyJson } from '@/components/copy-variants'
import { copyTextLabel, measureCopy } from '@/components/copy-feedback'
import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { tapFeedback } from '@/components/haptics'
import { NativeDiffBlock } from '@/components/native-diff-block'
import { MESSAGE_ACTION_HIT_SLOP } from '@/components/session-message-logic'
import { NativeFlowRow } from '@/components/native-flow-row'
import { NativeIcon } from '@/components/native-icon'
import { NativeListRow } from '@/components/native-list'
import type { NativeIconName } from '@/components/native-icon'
import { toolArgument, type NativeConversationRow } from '@/components/session-conversation-logic'
import { toolFileChange } from '@/components/tool-diff-logic'
import { describeRow, toolRowView, toolTitleKey } from '@/components/tool-row-view'
import { ToolTodoList } from '@/components/native-tool-todo-list'
import { ToolQuestionList } from '@/components/native-tool-question-list'
import { format, t as message } from '@/locale'
import type { SharedMessagePresentation } from '@/shared/dsh-presentation'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import * as Clipboard from 'expo-clipboard'
import { MONOSPACE_FONT } from '@/theme/platform'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native'

/** Lines a payload shows before it folds; the same fold the code block uses. */
const PAYLOAD_COLLAPSED_LINES = 16

type Variant = 'search' | 'read' | 'image' | 'bash' | 'write' | 'edit' | 'code' | 'web' | 'other'
type ToolRow = Extract<NativeConversationRow, { kind: 'tool' }>
type ToolCardModel = {
  output?: string
  state: 'completed' | 'failed' | 'running'
  summary?: string
  toolInput?: string
  toolName: string
}

function variantFor(name?: string): Variant {
  const value = (name ?? '').toLowerCase()
  // The desktop splits image reads out of plain reads (`tool.title.readImage`).
  if (/image|screenshot/.test(value)) return 'image'
  if (/search|grep|find/.test(value)) return 'search'
  if (/bash|shell|terminal|command/.test(value)) return 'bash'
  if (/write|create/.test(value)) return 'write'
  if (/edit|patch|replace/.test(value)) return 'edit'
  if (/code|python|javascript/.test(value)) return 'code'
  if (/web|browser|fetch/.test(value)) return 'web'
  if (/read|file|cat/.test(value)) return 'read'
  return 'other'
}

const META: Record<Variant, [NativeIconName, string]> = {
  search: ['search-outline', message('tool.verbSearch')],
  read: ['deliver-doc', message('tool.verbRead')],
  image: ['deliver-doc', message('tool.verbReadImage')],
  bash: ['code-outline', message('tool.verbCommand')],
  write: ['new-chat-outline', message('tool.verbWrite')],
  edit: ['edit-outline', message('tool.verbEdit')],
  code: ['code-outline', message('tool.verbCode')],
  web: ['globe-outline', message('tool.verbWeb')],
  other: ['sparkle', message('tool.verbGeneric')],
}

/**
 * Renders one desktop-derived tool lifecycle as a compact native conversation row.
 *
 * @param props.presentation - Legacy shared projection used by the subagent view.
 * @param props.row - Full primary-session projection with desktop tool metadata.
 * @returns An expandable compact tool row.
 */
export function NativeToolCard({
  presentation,
  row,
}: {
  presentation?: SharedMessagePresentation
  row?: ToolRow
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const [expanded, toggleExpanded] = useConversationDisclosure(
    row ? conversationRowKey(row) : `tool:${presentation?.sourceSeq ?? presentation?.callId ?? 'legacy'}`,
  )
  const model = useMemo<ToolCardModel>(() => {
    if (row !== undefined) {
      return {
        state: row.state,
        toolName: row.toolName,
        ...(row.summary === undefined ? {} : { summary: row.summary }),
        ...(row.toolInput === undefined ? {} : { toolInput: row.toolInput }),
        ...(row.output === undefined ? {} : { output: row.output }),
      }
    }
    return {
      state: presentation?.toolState ?? 'running',
      toolName: presentation?.toolName ?? message('tool.title'),
      ...(presentation?.toolInput === undefined ? {} : { toolInput: presentation.toolInput }),
      ...(presentation?.toolOutput === undefined ? {} : { output: presentation.toolOutput }),
      ...(presentation?.text ? { summary: presentation.text } : {}),
    }
  }, [presentation, row])
  const [icon, variantTitle] = useMemo(() => META[variantFor(model.toolName)], [model.toolName])
  const title = useMemo(() => {
    const exact = toolTitleKey(model.toolName)
    return exact === undefined ? variantTitle : message(exact)
  }, [model.toolName, variantTitle])
  // Each tool names its own subject, the way the desktop's per-tool card models do:
  // a read reports its path and line count, a search its pattern and hits, a shell call
  // its command line. The generic argument falls back when the tool is not one of those.
  const view = useMemo(
    () =>
      toolRowView({
        toolName: model.toolName,
        state: model.state,
        ...(model.toolInput === undefined ? {} : { toolInput: model.toolInput }),
        ...(model.output === undefined ? {} : { output: model.output }),
        ...(row?.toolMeta === undefined ? {} : { toolMeta: row.toolMeta }),
      }),
    [model.output, model.state, model.toolInput, model.toolName, row?.toolMeta],
  )
  const exitLabel =
    view.kind === 'command' && model.state !== 'running'
      ? view.signal !== undefined
        ? format('tool.signal', { signal: view.signal })
        : view.exitCode !== undefined && view.exitCode !== 0
          ? format('tool.exitCode', { code: view.exitCode })
          : undefined
      : undefined
  const failed = model.state === 'failed' || exitLabel !== undefined
  const summary =
    describeRow(view) ??
    model.summary ??
    toolArgument(model.toolInput) ??
    (model.toolName === title ? undefined : model.toolName)
  const stateLabel = failed
    ? message('tool.stateFailed')
    : model.state === 'completed'
      ? message('tool.stateCompleted')
      : message('tool.stateRunning')
  // A file mutation reads better as its change than as its arguments, so the
  // diff replaces the raw input exactly where the desktop replaces it.
  const change = useMemo(() => toolFileChange(model.toolName, model.toolInput), [model.toolInput, model.toolName])
  const hasDetails = Boolean(model.toolInput || model.output)
  const inputText = view.kind === 'code' && view.source !== undefined ? view.source : model.toolInput
  return (
    <View style={styles.root}>
      <NativeFlowRow
        accessibilityLabel={format('tool.accessibilityLabel', { tool: summary ?? title, state: stateLabel })}
        expandable={hasDetails}
        icon={icon}
        keepContentWhenOpen
        open={expanded}
        summary={summary}
        title={title}
        tone={failed ? 'danger' : 'tertiary'}
        trailing={
          exitLabel === undefined ? undefined : (
            <View style={styles.exitBadge}>
              <View style={styles.exitDot} />
              <Text numberOfLines={1} style={styles.exitText}>
                {exitLabel}
              </Text>
            </View>
          )
        }
        {...(hasDetails ? { onToggle: toggleExpanded } : {})}
      >
        {/* The body follows the tool. A diff replaces the arguments where the call changed
            a file; a todo list renders as its items rather than as the JSON that wrote
            them; every other tool shows its result, because the arguments only repeat what
            the summary already names. */}
        {change !== undefined ? (
          <NativeDiffBlock change={change} />
        ) : view.kind === 'todo' ? (
          <ToolTodoList items={view.items} />
        ) : view.kind === 'question' ? (
          <ToolQuestionList items={view.items} />
        ) : view.body !== undefined ? (
          <ToolPayload label={message('tool.output')} text={view.body} failed={failed} />
        ) : inputText ? (
          <ToolPayload label={message('tool.input')} text={inputText} />
        ) : null}
      </NativeFlowRow>
    </View>
  )
}

function ToolPayload({
  label,
  text,
  failed = false,
}: {
  label: string
  text: string
  failed?: boolean
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [copyMenuOpen, setCopyMenuOpen] = useState(false)
  const [copySize, setCopySize] = useState<string | undefined>(undefined)
  const [expanded, setExpanded] = useState(false)
  const lineCount = useMemo(() => measureCopy(text).lines, [text])
  const collapsible = lineCount > PAYLOAD_COLLAPSED_LINES
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )
  // Long-press selection is hard to aim inside a nested scroll view, so the payload
  // carries its own control and reports what reached the clipboard.
  const copy = async (): Promise<void> => {
    if (copied) return
    const label = copyTextLabel(measureCopy(text))
    try {
      await Clipboard.setStringAsync(text)
      tapFeedback()
      setCopied(true)
      setCopyFailed(false)
      setCopySize(label)
      void AccessibilityInfo.announceForAccessibility(label)
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        setCopied(false)
        setCopySize(undefined)
      }, 1200)
    } catch {
      setCopyFailed(true)
    }
  }
  /**
   * Offers the desktop's copy variants for a payload.
   *
   * A pointer right-clicks a payload to pick a representation; the phone reaches the
   * same choices from a long press, and only offers JSON when the text parses as JSON.
   */
  const openCopyMenu = async (): Promise<void> => {
    const parsed = parseJsonPayload(text)
    if (parsed === undefined) {
      await writeClipboard(text)
      return
    }
    setCopyMenuOpen(true)
  }
  const writeClipboard = async (value: string): Promise<void> => {
    const label = copyTextLabel(measureCopy(value))
    try {
      await Clipboard.setStringAsync(value)
      tapFeedback()
      setCopied(true)
      setCopyFailed(false)
      setCopySize(label)
      void AccessibilityInfo.announceForAccessibility(label)
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        setCopied(false)
        setCopySize(undefined)
      }, 1200)
    } catch {
      setCopyFailed(true)
    }
  }
  return (
    <View style={styles.payload}>
      <NativeAnchoredPanel open={copyMenuOpen} onClose={() => setCopyMenuOpen(false)}>
        <NativeListRow
          title={message('copy.copyJsonPretty')}
          accessibilityRole="button"
          onPress={() => {
            setCopyMenuOpen(false)
            void writeClipboard(prettyJson(parseJsonPayload(text)))
          }}
        />
        <NativeListRow
          title={message('copy.copyJsonCompact')}
          accessibilityRole="button"
          onPress={() => {
            setCopyMenuOpen(false)
            void writeClipboard(compactJson(parseJsonPayload(text)))
          }}
        />
      </NativeAnchoredPanel>
      <View style={styles.payloadHead}>
        <Text style={styles.payloadLabel}>{label}</Text>
        {copySize === undefined ? null : <Text style={styles.payloadSize}>{copySize}</Text>}
        <View style={styles.payloadActions}>
          {collapsible ? (
            <Pressable
              android_ripple={{ borderless: false }}
              accessibilityRole="button"
              accessibilityLabel={
                expanded ? message('tool.collapsePayload') : format('tool.expandPayload', { lines: lineCount })
              }
              hitSlop={MESSAGE_ACTION_HIT_SLOP}
              onPress={() => setExpanded((value) => !value)}
              style={({ pressed }) => [styles.payloadFold, pressed && styles.payloadFoldPressed]}
            >
              <Text style={styles.payloadFoldText}>
                {expanded ? message('tool.collapsePayload') : format('tool.expandPayload', { lines: lineCount })}
              </Text>
              <NativeIcon
                name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={12}
                color={theme.colors.accent}
              />
            </Pressable>
          ) : null}
          <Pressable
            android_ripple={{ borderless: false }}
            accessibilityRole="button"
            accessibilityLabel={copied ? (copySize ?? message('copy.copiedText')) : message('copy.copyPayload')}
            accessibilityHint={message('copy.jsonOptionsHint')}
            delayLongPress={350}
            onLongPress={() => void openCopyMenu()}
            accessibilityState={{ selected: copied }}
            hitSlop={MESSAGE_ACTION_HIT_SLOP}
            onPress={() => void copy()}
            style={styles.payloadCopy}
          >
            <NativeIcon
              name={copied ? 'check-outline' : 'copy-outline'}
              size={14}
              color={copied ? theme.colors.success : copyFailed ? theme.colors.danger : theme.colors.inkTertiary}
            />
          </Pressable>
        </View>
      </View>
      {/* The payload wraps instead of scrolling sideways: a horizontal scroller
          inside a vertical list fights every drag and hides the long lines it was
          added for. A folded payload ends at the same line the count names. */}
      <Text
        selectable
        numberOfLines={expanded ? undefined : PAYLOAD_COLLAPSED_LINES}
        style={[styles.detailText, failed && styles.failedDetailText]}
      >
        {text}
      </Text>
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { minWidth: 0 },
    divider: { backgroundColor: theme.colors.border, height: StyleSheet.hairlineWidth },
    // Desktop `ToolRow.module.css .ioCard`: rounded code-block surface with hairline border.
    payload: {
      backgroundColor: theme.colors.codeBackground,
      borderColor: theme.colors.borderHairline,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    // The label, the copy size and the control share one 16pt row so the payload
    // header keeps its height while the confirmation appears and disappears.
    // A 28pt header row leaves the 16pt copy and fold controls at 44 once their
    // 8pt hit slop is counted; at 16 they were 32 and hard to hit in a long list.
    payloadHead: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 28 },
    payloadLabel: { color: theme.colors.inkTertiary, fontSize: 11, fontWeight: '500', lineHeight: 16 },
    payloadSize: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 11, lineHeight: 16 },
    // The fold control moves into the header row, so a payload spends one row on
    // its label, its size, its fold and its copy instead of three.
    payloadActions: { alignItems: 'center', flexDirection: 'row', gap: 10, marginLeft: 'auto' },
    payloadFold: { alignItems: 'center', flexDirection: 'row', gap: 2 },
    payloadFoldPressed: { opacity: 0.62 },
    payloadFoldText: { color: theme.colors.accent, fontSize: 12, fontWeight: '500', lineHeight: 16 },
    payloadCopy: { alignItems: 'center', height: 16, justifyContent: 'center', width: 16 },
    detailText: { color: theme.colors.ink, fontFamily: MONOSPACE_FONT, fontSize: 12, lineHeight: 18 },
    failedDetailText: { color: theme.colors.danger },
    // Desktop `ExitCodeBadge`: neutral capsule with 4×4 danger dot for non-zero exits.
    exitBadge: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      flexDirection: 'row',
      gap: 5,
      marginLeft: 8,
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    exitDot: { backgroundColor: theme.colors.danger, borderRadius: 2, height: 4, width: 4 },
    exitText: { color: theme.colors.inkTertiary, fontSize: 11, lineHeight: 16 },
  })
