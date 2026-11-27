import { useConversationDisclosure } from './conversation-disclosure'
import { conversationRowKey } from './conversation-flow'
import { NativeContextBody, resolveContextPresentation } from '@/components/native-context-body'
import { NativeFlowRow, type FlowHeaderSegment } from '@/components/native-flow-row'
import type { NativeIconName } from '@/components/native-icon'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

type ContextRow = Extract<NativeConversationRow, { kind: 'context' }>

/**
 * Renders one logged context injection, cross-session recall, system prompt, or tool-set
 * change disclosure matching desktop `ContextInjectionRow.tsx` and `SystemPromptRow.tsx`.
 */
export function NativeContextRow({ row }: { row: ContextRow }): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [open, toggleOpen] = useConversationDisclosure(conversationRowKey(row))
  const isSystem = row.role === 'system'
  const isRecall = row.role === 'recall'
  const toolChanges = row.toolChanges
  const isSingleToolChange = toolChanges?.single !== undefined
  const presentation = useMemo(
    () =>
      resolveContextPresentation({
        contentBlocks: row.contentBlocks,
        form: isSystem ? undefined : row.form,
        source: isSystem ? null : (row.source ?? null),
        text: row.text,
      }),
    [isSystem, row.contentBlocks, row.form, row.source, row.text],
  )
  const icon: NativeIconName =
    toolChanges !== undefined || isSystem ? 'deliver-doc' : isRecall ? 'new-chat-outline' : 'context'
  const title =
    row.title ??
    (isRecall
      ? message('conversation.contextRecall')
      : isSystem
        ? message('conversation.systemPrompt')
        : message('conversation.contextInjection'))
  const headerSegments = useMemo<readonly FlowHeaderSegment[]>(() => {
    if (isSystem || isSingleToolChange) return []
    if (toolChanges !== undefined) {
      return row.summary !== undefined && row.summary !== '' ? [{ text: row.summary, flex: true }] : []
    }
    const segments: FlowHeaderSegment[] = []
    const resolvedSummary = presentation.summary ?? row.summary ?? null
    if (row.producer !== '') {
      segments.push({ text: row.producer, flex: resolvedSummary === null || resolvedSummary === '' })
    }
    if (resolvedSummary !== null && resolvedSummary !== '') {
      segments.push({ text: resolvedSummary, flex: true })
    }
    return segments
  }, [isSingleToolChange, isSystem, presentation.summary, row.producer, row.summary, toolChanges])
  const expandable =
    !isSingleToolChange &&
    (toolChanges !== undefined ? toolChanges.added.length > 0 || toolChanges.removed.length > 0 : presentation.hasBody)
  const accessibilityLabel =
    headerSegments.length === 0 ? title : `${title} · ${headerSegments.map((segment) => segment.text).join(' · ')}`
  return (
    <NativeFlowRow
      accessibilityLabel={accessibilityLabel}
      bodyStyle={s.flowBody}
      expandable={expandable}
      headerSegments={headerSegments}
      icon={icon}
      keepContentWhenOpen
      open={open && expandable}
      openIconColor={theme.colors.inkMuted}
      openPaddingBottom={4}
      title={title}
      tone="tertiary"
      {...(expandable ? { onToggle: toggleOpen } : {})}
    >
      {expandable ? (
        <ScrollView nestedScrollEnabled style={s.bodyScroll} contentContainerStyle={s.bodyContent}>
          {toolChanges !== undefined ? (
            <View style={s.toolChanges}>
              {toolChanges.added.length > 0 ? (
                <Text selectable style={s.toolChangeLine}>
                  {format('conversation.toolsAdded', { names: toolChanges.added.join(', ') })}
                </Text>
              ) : null}
              {toolChanges.removed.length > 0 ? (
                <Text selectable style={s.toolChangeLine}>
                  {format('conversation.toolsRemoved', { names: toolChanges.removed.join(', ') })}
                </Text>
              ) : null}
            </View>
          ) : (
            <NativeContextBody
              contentBlocks={row.contentBlocks}
              form={isSystem ? undefined : row.form}
              source={isSystem ? null : (row.source ?? null)}
              text={row.text}
            />
          )}
        </ScrollView>
      ) : null}
    </NativeFlowRow>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Desktop `ContextInjectionRow.module.css .body`: 4px top margin, 22px left indent, 0 extra bottom pad (root owns 4px).
    flowBody: { paddingBottom: 0, paddingLeft: 22, paddingTop: 4 },
    // Desktop `ContextInjectionRow.module.css .body`: 141px max-height code-block surface, radius-md (12px).
    bodyScroll: {
      backgroundColor: theme.colors.codeBackground,
      borderRadius: theme.radius.md,
      maxHeight: 141,
    },
    bodyContent: {
      paddingBottom: 12,
      paddingLeft: 12,
      paddingRight: 16,
      paddingTop: 10,
    },
    toolChanges: { gap: 2 },
    toolChangeLine: { color: theme.colors.inkTertiary, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
  })
