import { NativeIcon } from '@/components/native-icon'
import type { QuestionItem } from '@/components/tool-row-view'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/**
 * The questions an `ask_user_question` call put to the reader, with the answers given.
 *
 * The arguments carry the questions and the result carries the answers, so the call's own
 * JSON says nothing a reader can act on: the desktop prints a card of question/answer
 * pairs. This is that card, one block per question, the chosen labels marked.
 *
 * @param props.items - The questions the call asked and the answers recorded for them.
 * @returns The question card.
 */
export const ToolQuestionList = memo(function ToolQuestionList({
  items,
}: {
  items: readonly QuestionItem[]
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.list}>
      {items.map((item, index) => {
        const chosen = new Set(item.answers)
        return (
          <View key={`${String(index)}:${item.question}`} style={s.item}>
            <Text style={s.question}>{item.question}</Text>
            {item.detail === undefined ? null : <Text style={s.detail}>{item.detail}</Text>}
            {item.options.length === 0 ? null : (
              <View style={s.options}>
                {item.options.map((label) => {
                  const picked = chosen.has(label)
                  return (
                    <View key={label} style={[s.option, picked && s.optionPicked]}>
                      {picked ? <NativeIcon color={theme.colors.accent} name="check-outline" size={13} /> : null}
                      <Text style={[s.optionText, picked && s.optionTextPicked]}>{label}</Text>
                    </View>
                  )
                })}
              </View>
            )}
            {/* A free-text answer has no option to mark, so it prints on its own line. */}
            {item.answers.filter((answer) => !item.options.includes(answer)).length === 0 ? null : (
              <Text style={s.custom}>{item.answers.filter((answer) => !item.options.includes(answer)).join('，')}</Text>
            )}
          </View>
        )
      })}
    </View>
  )
})

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    list: { gap: 10, paddingBottom: 4, paddingTop: 2 },
    item: { gap: 6 },
    question: { color: theme.colors.ink, fontSize: 14, lineHeight: 22 },
    detail: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    option: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    optionPicked: { backgroundColor: theme.colors.accentSoft },
    optionText: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    optionTextPicked: { color: theme.colors.accentText, fontWeight: '500' },
    custom: { color: theme.colors.ink, fontSize: 13, lineHeight: 20 },
  })
