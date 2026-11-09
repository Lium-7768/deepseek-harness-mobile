import { NativeFlowRow } from '@/components/native-flow-row'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { StyleSheet, Text } from 'react-native'
import { useState } from 'react'

type ContextRow = Extract<NativeConversationRow, { kind: 'context' }>

/**
 * One logged context injection: what the model was handed, not what the reader typed.
 *
 * The desktop draws these as the same 24pt disclosure a tool call uses, titled
 * `上下文注入` and followed by the producer that logged it (`time-context`,
 * `skill-catalog`, …), so a reader can tell a project instruction file from a time
 * snapshot without expanding. The body is the injected text.
 *
 * @param props.row - The injection row.
 * @returns The disclosure row.
 */
export function NativeContextRow({ row }: { row: ContextRow }): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const [open, setOpen] = useState(false)
  return (
    <NativeFlowRow
      accessibilityLabel={`${message('conversation.contextInjection')} · ${row.producer}`}
      expandable
      icon="context"
      open={open}
      summary={row.summary}
      title={`${message('conversation.contextInjection')} · ${row.producer}`}
      tone="tertiary"
      onToggle={() => setOpen((current) => !current)}
    >
      <Text selectable style={s.body}>
        {row.text}
      </Text>
    </NativeFlowRow>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `ContextBody`: the opaque body is the injected text at the secondary size.
    body: { color: theme.colors.inkTertiary, fontSize: 13, lineHeight: 20 },
  })
