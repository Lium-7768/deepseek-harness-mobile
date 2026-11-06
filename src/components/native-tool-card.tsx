import { useConversationDisclosure } from './conversation-disclosure'
import { conversationRowKey } from './conversation-flow'
import { copyTextLabel, measureCopy } from '@/components/copy-feedback'
import { tapFeedback } from '@/components/haptics'
import { NativeDiffBlock } from '@/components/native-diff-block'
import { MESSAGE_ACTION_HIT_SLOP } from '@/components/session-message-logic'
import { NativeFlowRow } from '@/components/native-flow-row'
import { NativeIcon } from '@/components/native-icon'
import type { NativeIconName } from '@/components/native-icon'
import { toolArgument, type NativeConversationRow } from '@/components/session-conversation-logic'
import { toolFileChange } from '@/components/tool-diff-logic'
import { format, t as message } from '@/locale'
import type { SharedMessagePresentation } from '@/shared/dsh-presentation'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import * as Clipboard from 'expo-clipboard'
import { MONOSPACE_FONT } from '@/theme/platform'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

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
  const [icon, fallbackTitle] = useMemo(() => META[variantFor(model.toolName)], [model.toolName])
  // The desktop prints "<verb> · <summary>"; the summary carries the argument a
  // reader needs, and the tool name only stands in when there is none.
  const summary =
    model.summary ?? toolArgument(model.toolInput) ?? (model.toolName === fallbackTitle ? undefined : model.toolName)
  const stateLabel =
    model.state === 'completed'
      ? message('tool.stateCompleted')
      : model.state === 'failed'
        ? message('tool.stateFailed')
        : message('tool.stateRunning')
  // A file mutation reads better as its change than as its arguments, so the
  // diff replaces the raw input exactly where the desktop replaces it.
  const change = useMemo(() => toolFileChange(model.toolName, model.toolInput), [model.toolInput, model.toolName])
  const hasDetails = Boolean(model.toolInput || model.output)
  return (
    <View style={styles.root}>
      <NativeFlowRow
        accessibilityLabel={format('tool.accessibilityLabel', { tool: summary ?? fallbackTitle, state: stateLabel })}
        expandable={hasDetails}
        icon={icon}
        open={expanded}
        summary={summary}
        title={fallbackTitle}
        tone={model.state === 'failed' ? 'danger' : 'tertiary'}
        {...(hasDetails ? { onToggle: toggleExpanded } : {})}
      >
        {change === undefined ? (
          model.toolInput ? (
            <ToolPayload label={message('tool.input')} text={model.toolInput} />
          ) : null
        ) : (
          <NativeDiffBlock change={change} />
        )}
        {model.toolInput && model.output ? <View style={styles.divider} /> : null}
        {model.output ? (
          <ToolPayload label={message('tool.output')} text={model.output} failed={model.state === 'failed'} />
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
  const [copySize, setCopySize] = useState<string | undefined>(undefined)
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
      void AccessibilityInfo.announceForAccessibility(`${message('copy.copiedText')} ${label}`)
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
      <View style={styles.payloadHead}>
        <Text style={styles.payloadLabel}>{label}</Text>
        {copySize === undefined ? null : <Text style={styles.payloadSize}>{copySize}</Text>}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? (copySize ?? message('copy.copiedText')) : message('copy.copyPayload')}
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
      <ScrollView nestedScrollEnabled style={styles.payloadScroll} showsVerticalScrollIndicator>
        <Text selectable style={[styles.detailText, failed && styles.failedDetailText]}>
          {text}
        </Text>
      </ScrollView>
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { minWidth: 0 },
    divider: { backgroundColor: theme.colors.border, height: StyleSheet.hairlineWidth },
    payload: { gap: 4 },
    // The label, the copy size and the control share one 16pt row so the payload
    // header keeps its height while the confirmation appears and disappears.
    payloadHead: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 16 },
    payloadLabel: { color: theme.colors.inkTertiary, fontSize: 11, fontWeight: '500', lineHeight: 16 },
    payloadSize: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 11, lineHeight: 16 },
    payloadCopy: { alignItems: 'center', height: 16, justifyContent: 'center', marginLeft: 'auto', width: 16 },
    payloadScroll: { maxHeight: 208 },
    detailText: { color: theme.colors.ink, fontFamily: MONOSPACE_FONT, fontSize: 12, lineHeight: 18 },
    failedDetailText: { color: theme.colors.danger },
  })
