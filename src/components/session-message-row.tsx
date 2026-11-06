import { MobileApi } from '@/api/mobile-api'
import {
  NativeCommandRow,
  NativeCompactionRow,
  NativeReasoningRow,
  NativeRetryRow,
  NativeTurnErrorRow,
  NativeTurnMaxTokensRow,
} from '@/components/native-conversation-status'
import { copyTextLabel, measureCopy } from '@/components/copy-feedback'
import { NativeIcon } from '@/components/native-icon'
import { NativeMarkdown } from '@/components/native-markdown'
import { NativeMessageAttachments } from '@/components/native-message-attachments'
import { NativeMessageFeedback } from '@/components/native-message-feedback'
import { NativeToolCard } from '@/components/native-tool-card'
import { type NativeConversationRow } from '@/components/session-conversation-logic'
import {
  MESSAGE_ACTION_HIT_SLOP,
  formatMessageTime,
  messageActionLayout,
  type MessageActionAlignment,
} from '@/components/session-message-logic'
import { makeSessionStyles } from '@/components/session-screen-styles'
import { t as message } from '@/locale'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import * as Clipboard from 'expo-clipboard'
import { memo, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Pressable, Text, View } from 'react-native'

export const MessageRow = memo(function MessageRow({
  item,
  compact = false,
  onBranch,
  showActions = true,
  event,
  api,
  sessionId,
}: {
  item: NativeConversationRow
  /** Forks the session at this row's message; the drawer owns the same action. */
  onBranch?: (sourceSeq: number) => void
  showActions?: boolean
  /** Mid-turn block: the copy control only, without the clock, rating and branch action. */
  compact?: boolean
  event: Record<string, unknown> | undefined
  api: MobileApi | undefined
  sessionId: string | undefined
}): React.JSX.Element {
  const s = useThemedStyles(makeSessionStyles)
  const attachments =
    api !== undefined && sessionId !== undefined ? (
      <NativeMessageAttachments api={api} sessionId={sessionId} event={event} />
    ) : null
  // The Web puts the rating pair inside the same action strip as Copy, between
  // Copy and the tail clock (MessageIconActions `.actions`).
  const feedback =
    api !== undefined && sessionId !== undefined ? (
      <NativeMessageFeedback api={api} event={event} inline sessionId={sessionId} />
    ) : null
  if (item.kind === 'user')
    return (
      <View style={s.userRow}>
        <View style={s.userBubble}>
          <Text selectable style={s.userText}>
            {item.text}
          </Text>
        </View>
        {attachments}
        <MessageActions alignment="user" text={item.text} time={item.time} />
      </View>
    )
  if (item.kind === 'reasoning') return <NativeReasoningRow row={item} />
  if (item.kind === 'retry') return <NativeRetryRow row={item} />
  if (item.kind === 'turn-error') return <NativeTurnErrorRow row={item} />
  if (item.kind === 'turn-max-tokens') return <NativeTurnMaxTokensRow />
  if (item.kind === 'command') return <NativeCommandRow row={item} />
  if (item.kind === 'compaction') return <NativeCompactionRow row={item} />
  if (item.kind === 'tool')
    return (
      <View style={s.toolRow}>
        <NativeToolCard row={item} />
      </View>
    )
  return (
    <View style={s.assistantRow}>
      <NativeMarkdown
        markdown={item.text}
        onCopyCode={async (code) => {
          await Clipboard.setStringAsync(code)
        }}
      />
      {attachments}
      {showActions ? (
        <MessageActions
          alignment="assistant"
          compact={compact}
          text={item.text}
          time={compact ? undefined : item.time}
          trailing={compact ? undefined : feedback}
          {...(compact || onBranch === undefined || item.sourceSeq === undefined
            ? {}
            : { onBranch: () => onBranch(item.sourceSeq as number) })}
        />
      ) : null}
    </View>
  )
})

export function MessageActions({
  alignment,
  compact = false,
  onBranch,
  text,
  time,
  trailing,
}: {
  alignment: MessageActionAlignment
  /** Renders the copy control alone; a mid-turn block does not repeat the clock or branch. */
  compact?: boolean
  text: string
  time?: number
  /** Rating controls the Web draws between Copy and the branch action. */
  trailing?: React.ReactNode
  /** Forks the session at this message; omission hides the branch control. */
  onBranch?: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeSessionStyles)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  // The phone cannot show the selection a copy takes, so the confirmation names it.
  const [copySize, setCopySize] = useState<string | undefined>(undefined)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  const copy = async (): Promise<void> => {
    if (copied) return
    const size = measureCopy(text)
    const label = copyTextLabel(size)
    try {
      await Clipboard.setStringAsync(text)
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
      void AccessibilityInfo.announceForAccessibility(message('conversation.copyFailed'))
    }
  }

  return (
    <View style={[s.actionRow, alignment === 'user' ? s.actionRowUser : s.actionRowAssistant]}>
      {/* `.timeStart` leads a user row; `.timeEnd` follows an assistant row's icons. */}
      {compact || time === undefined || alignment !== 'user' ? null : (
        <Text ellipsizeMode="tail" numberOfLines={1} style={[s.actionTime, s.actionTimeUser]}>
          {formatMessageTime(time)}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          copied
            ? (copySize ?? message('conversation.copied'))
            : copyFailed
              ? message('conversation.copyFailedTitle')
              : message('conversation.copyMessage')
        }
        accessibilityState={{ selected: copied }}
        onPress={() => void copy()}
        hitSlop={MESSAGE_ACTION_HIT_SLOP}
        style={({ pressed }) => [messageActionLayout(alignment), s.actionButton, pressed && s.pressed]}
      >
        <NativeIcon
          name={copied ? 'check-outline' : 'copy-outline'}
          size={15}
          color={copied ? theme.colors.success : copyFailed ? theme.colors.danger : theme.colors.inkTertiary}
        />
      </Pressable>
      {/* The size sits beside the icon, not inside it: a width change on the button
          itself would shift every sibling in the action row. */}
      {copySize === undefined ? null : (
        <Text ellipsizeMode="tail" numberOfLines={1} style={s.actionCopySize}>
          {copySize}
        </Text>
      )}
      {trailing}
      {onBranch === undefined ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={message('conversation.branchFromMessage')}
          onPress={onBranch}
          hitSlop={MESSAGE_ACTION_HIT_SLOP}
          style={({ pressed }) => [messageActionLayout(alignment), s.actionButton, pressed && s.pressed]}
        >
          <NativeIcon name="branch-outline" size={16} color={theme.colors.inkTertiary} />
        </Pressable>
      )}
      {compact || time === undefined || alignment !== 'assistant' ? null : (
        <Text ellipsizeMode="tail" numberOfLines={1} style={[s.actionTime, s.actionTimeEnd]}>
          {formatMessageTime(time)}
        </Text>
      )}
    </View>
  )
}
