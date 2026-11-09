import { NativeFlowRow } from '@/components/native-flow-row'
import { format } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import type { DshQuestion } from '@/types/mobile'
import { StyleSheet, Text } from 'react-native'

/**
 * Says a Turn is waiting on the reader, with the question it is waiting for.
 *
 * The desktop answers questions inside the transcript, where a card has room and a
 * pointer can reach every option. On a phone a full card would push the answer away
 * from the keyboard it needs, so this row names what is being asked and hands the
 * reader to the pending screen that owns the form.
 *
 * @param props.questions - Pending questions for this session, in arrival order.
 * @param props.onOpen - Opens the screen that answers them.
 * @returns The prompt row, or `null` when nothing is pending.
 */
export function NativeQuestionPromptRow({
  onOpen,
  questions,
}: {
  onOpen: () => void
  questions: readonly DshQuestion[]
}): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  const first = questions[0]
  if (first === undefined) return null
  const summary = first.question.trim()
  const more = questions.length - 1
  return (
    <NativeFlowRow
      accessibilityLabel={
        more > 0
          ? format('conversation.questionWaitingMore', { question: summary, count: more })
          : format('conversation.questionWaiting', { question: summary })
      }
      expandable
      icon="context"
      onToggle={onOpen}
      open={false}
      summary={more > 0 ? format('conversation.questionWaitingMore', { question: summary, count: more }) : summary}
      title={format('conversation.questionWaiting', { question: summary })}
      tone="tertiary"
    >
      <Text style={s.hint}>{format('conversation.questionWaitingHint', {})}</Text>
    </NativeFlowRow>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    hint: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
  })
