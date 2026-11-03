import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { NativeIcon } from '@/components/native-icon'
import { MESSAGE_ACTION_HIT_SLOP, messageActionLayout } from '@/components/session-message-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileFeedbackItem, MobileFeedbackRating } from '@/types/mobile'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type Props = {
  api: MobileApi
  sessionId: string
  event: Record<string, unknown> | undefined
  /** Renders the pair as part of a caller's action strip instead of its own row. */
  inline?: boolean
}

/** Reads the stable `message.id` the feedback sidecar keys on, if the event has one. */
function feedbackMessageId(event: Record<string, unknown> | undefined): string | undefined {
  const data = recordOf(event?.data)
  const message = recordOf(data?.message)
  const id = message?.id
  return typeof id === 'string' && id.trim() ? id : undefined
}

/**
 * Renders the Like/Dislike pair for one assistant message.
 *
 * Reads the Session's feedback sidecar once and toggles against the committed
 * item, mirroring the desktop controller: a press that matches the recorded
 * rating retracts it, anything else replaces it. Retraction happens only when
 * the message has a stable id (a settled `assistant/message`), so a streaming
 * or unpersisted row renders nothing.
 */
export function NativeMessageFeedback(props: Props): React.JSX.Element | null {
  // Gate before the hooks: a conversation mounts one of these per row, and a row
  // without a stable message id (streaming, tool, or user turns) must not create a
  // feedback query and two mutation observers it will never use.
  const messageId = useMemo(() => feedbackMessageId(props.event), [props.event])
  if (messageId === undefined) return null

  return <FeedbackControls {...props} messageId={messageId} />
}

/** The toggle pair itself, mounted only for a message that can carry a rating. */
function FeedbackControls({
  api,
  sessionId,
  inline = false,
  messageId,
}: Props & { messageId: string }): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)

  const queryClient = useQueryClient()
  const [mutationError, setMutationError] = useState<string | null>(null)
  const feedback = useQuery({
    queryKey: queryKeys.sessionFeedback(sessionId),
    queryFn: ({ signal }) => api.withSignal(signal).listFeedback(sessionId),
    staleTime: Infinity,
  })
  const items = feedback.data?.ok === true ? feedback.data.value.items : []
  const item = items.find((candidate) => candidate.messageId === messageId)
  const rating = item?.rating
  const put = useMutation({
    mutationFn: (target: { messageId: string; rating: MobileFeedbackRating; ifVersion: string | null }) =>
      api.putFeedback(sessionId, target.messageId, target.rating, { ifVersion: target.ifVersion }),
    onSuccess: (result, variables) => {
      if (result.ok) {
        commitFeedback(queryClient, sessionId, variables.messageId, result.value)
        setMutationError(null)
        return
      }
      if (result.error.code === 'version-conflict') {
        // Another writer already moved the sidecar; adopt its value and stay quiet.
        commitFeedback(queryClient, sessionId, variables.messageId, result.error.current)
        setMutationError(null)
        return
      }
      setMutationError(feedbackErrorCode(result.error.code))
    },
  })
  const remove = useMutation({
    mutationFn: (target: { messageId: string; ifVersion: string }) =>
      api.deleteFeedback(sessionId, target.messageId, target.ifVersion),
    onSuccess: (result, variables) => {
      if (result.ok) {
        commitFeedback(queryClient, sessionId, variables.messageId, null)
        setMutationError(null)
        return
      }
      if (result.error.code === 'version-conflict') {
        commitFeedback(queryClient, sessionId, variables.messageId, result.error.current)
        setMutationError(null)
        return
      }
      setMutationError(feedbackErrorCode(result.error.code))
    },
  })
  const pending = put.isPending || remove.isPending

  const toggle = (next: MobileFeedbackRating): void => {
    if (messageId === undefined || pending) return
    setMutationError(null)
    // The desktop controller decides retract-vs-replace from the committed item:
    // a press matching the recorded rating retracts it, anything else replaces it.
    const observed = items.find((candidate) => candidate.messageId === messageId)
    if (observed?.rating === next) {
      remove.mutate({ messageId, ifVersion: observed.version })
    } else {
      put.mutate({ messageId, rating: next, ifVersion: observed?.version ?? null })
    }
  }

  const loadError = feedback.isError ? mobileErrorMessage(feedback.error, message('feedback.loadFailed')) : null
  const networkError = put.isError
    ? mobileErrorMessage(put.error, message('feedback.saveFailed'))
    : remove.isError
      ? mobileErrorMessage(remove.error, message('feedback.saveFailed'))
      : null

  const likeActive = rating === 'positive'
  const dislikeActive = rating === 'negative'

  return (
    <View style={inline ? styles.inline : styles.row}>
      <FeedbackButton
        active={likeActive}
        accessibilityLabel={likeActive ? message('feedback.rated') : message('feedback.rate')}
        color={likeActive ? theme.colors.success : theme.colors.inkTertiary}
        disabled={pending}
        icon="like-outline"
        onPress={() => void toggle('positive')}
      />
      <FeedbackButton
        active={dislikeActive}
        accessibilityLabel={dislikeActive ? message('feedback.unrated') : message('feedback.unrate')}
        color={dislikeActive ? theme.colors.danger : theme.colors.inkTertiary}
        disabled={pending}
        icon="dislike-outline"
        onPress={() => void toggle('negative')}
      />
      <FeedbackError text={loadError} />
      <FeedbackError text={networkError} />
      <FeedbackError text={mutationError} />
    </View>
  )
}

function FeedbackButton({
  active,
  accessibilityLabel,
  color,
  disabled,
  icon,
  onPress,
}: {
  active: boolean
  accessibilityLabel: string
  color: string
  disabled: boolean
  icon: 'like-outline' | 'dislike-outline'
  onPress: () => void
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      hitSlop={MESSAGE_ACTION_HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [messageActionLayout('assistant'), styles.actionButton, pressed && styles.pressed]}
    >
      <NativeIcon name={icon} size={15} color={color} />
    </Pressable>
  )
}

function FeedbackError({ text }: { text: string | null }): React.JSX.Element | null {
  const styles = useThemedStyles(makeStyles)
  return text === null ? null : <Text style={styles.failure}>{text}</Text>
}

/** Replaces or removes one message's feedback in the cached sidecar, or no-ops when unloaded. */
function commitFeedback(
  queryClient: ReturnType<typeof useQueryClient>,
  sessionId: string,
  messageId: string,
  item: MobileFeedbackItem | null,
): void {
  queryClient.setQueryData(queryKeys.sessionFeedback(sessionId), (existing: unknown) => {
    const current = existing as { ok: true; value: { items: MobileFeedbackItem[] } } | undefined
    if (current?.ok !== true) return existing
    const items = current.value.items.filter((candidate) => candidate.messageId !== messageId)
    return {
      ...current,
      value: { ...current.value, items: item === null ? items : items.concat(item) },
    }
  })
}

function feedbackErrorCode(code: string): string {
  switch (code) {
    case 'session-not-found':
      return message('feedback.noSession')
    case 'target-not-found':
      return message('feedback.noMessage')
    case 'note-blank':
    case 'note-too-large':
      return message('feedback.noteRejected')
    default:
      return message('feedback.saveFailed')
  }
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // The feedback pair is the first two controls of the same action strip, so it
    // shares the 28pt box, the 6px padding, and the 8pt gap (`.action`, `.actions`).
    row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, minHeight: 28 },
    inline: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
    actionButton: { alignItems: 'center', justifyContent: 'center', padding: 6 },
    failure: { color: theme.colors.danger, flexShrink: 1, fontSize: 11, lineHeight: 16 },
    pressed: { opacity: 0.62 },
  })
