import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { NativeIcon } from '@/components/native-icon'
import { messageActionLayout } from '@/components/session-message-logic'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileFeedbackItem, MobileFeedbackRating } from '@/types/mobile'

type Props = {
  api: MobileApi
  sessionId: string
  event: Record<string, unknown> | undefined
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
export function NativeMessageFeedback({ api, sessionId, event }: Props): React.JSX.Element | null {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const messageId = useMemo(() => feedbackMessageId(event), [event])
  const queryClient = useQueryClient()
  const [mutationError, setMutationError] = useState<string | null>(null)
  const feedback = useQuery({
    queryKey: ['session-feedback', sessionId],
    queryFn: () => api.listFeedback(sessionId),
    staleTime: Infinity,
  })
  const items = feedback.data?.ok === true ? feedback.data.value.items : []
  const item = items.find(candidate => candidate.messageId === messageId)
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
    const observed = items.find(candidate => candidate.messageId === messageId)
    if (observed?.rating === next) {
      remove.mutate({ messageId, ifVersion: observed.version })
    } else {
      put.mutate({ messageId, rating: next, ifVersion: observed?.version ?? null })
    }
  }

  const loadError = feedback.isError ? mobileErrorMessage(feedback.error, '评价记录加载失败。') : null
  const networkError = put.isError
    ? mobileErrorMessage(put.error, '评价失败，请稍后重试。')
    : remove.isError
      ? mobileErrorMessage(remove.error, '评价失败，请稍后重试。')
      : null

  const likeActive = rating === 'positive'
  const dislikeActive = rating === 'negative'

  if (messageId === undefined) return null

  return (
    <View style={styles.row}>
      <FeedbackButton
        active={likeActive}
        accessibilityLabel={likeActive ? '已赞成，再按一次取消' : '赞成'}
        color={likeActive ? theme.colors.success : theme.colors.inkMuted}
        disabled={pending}
        icon="thumb-up"
        onPress={() => void toggle('positive')}
      />
      <FeedbackButton
        active={dislikeActive}
        accessibilityLabel={dislikeActive ? '已反对，再按一次取消' : '反对'}
        color={dislikeActive ? theme.colors.danger : theme.colors.inkMuted}
        disabled={pending}
        icon="thumb-down"
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
  icon: 'thumb-up' | 'thumb-down'
  onPress: () => void
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [messageActionLayout('assistant'), pressed && styles.pressed]}
    >
      <NativeIcon name={icon} size={16} color={color} />
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
  queryClient.setQueryData(['session-feedback', sessionId], (existing: unknown) => {
    const current = existing as { ok: true; value: { items: MobileFeedbackItem[] } } | undefined
    if (current?.ok !== true) return existing
    const items = current.value.items.filter(candidate => candidate.messageId !== messageId)
    return {
      ...current,
      value: { ...current.value, items: item === null ? items : items.concat(item) },
    }
  })
}

function feedbackErrorCode(code: string): string {
  switch (code) {
    case 'session-not-found':
      return '会话不存在，无法保存评价。'
    case 'target-not-found':
      return '该消息已不存在，无法保存评价。'
    case 'note-blank':
    case 'note-too-large':
      return '备注不合法，请检查后重试。'
    default:
      return '评价失败，请稍后重试。'
  }
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, minHeight: 44 },
    failure: { color: theme.colors.danger, flexShrink: 1, fontSize: 11 },
    pressed: { opacity: 0.62 },
  })
