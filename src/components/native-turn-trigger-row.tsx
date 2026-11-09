import { tapFeedback } from '@/components/haptics'
import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import { triggerText, type NativeTurnTrigger } from '@/components/session-conversation-logic'
import { t as message } from '@/locale'
import { showSnackbar } from '@/state/snackbar'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

const TRIGGER_ICONS: Record<NativeTurnTrigger, NativeIconName> = {
  agent: 'paper-plane-outline',
  approval: 'shield-outline',
  continue: 'play-outline',
  goal: 'goal-outline',
  job: 'queue-outline',
  schedule: 'clock-outline',
  subagent: 'agent-preset-outline',
  subagentAborted: 'agent-preset-outline',
  subagentCompleted: 'agent-preset-outline',
  subagentError: 'agent-preset-outline',
  subagentMaxTokens: 'agent-preset-outline',
  subagentRefusal: 'agent-preset-outline',
  subagentUnknown: 'agent-preset-outline',
  team: 'apps-add-outline',
  webhook: 'globe-outline',
  github: 'branch-outline',
  plugin: 'plugin-pinwheel-outline',
}

/**
 * States what started a Turn the reader did not type.
 *
 * The desktop draws one of these above each Turn's disclosure so the assistant's
 * unprompted reply never looks spontaneous; its body holds the notification that
 * woke the agent. The phone keeps the one-line attribution and opens the body on
 * demand, because the waking notification is usually long and rarely reread.
 *
 * @param props - The trigger family and the waking notification's text.
 * @returns The row.
 */
export function NativeTurnTriggerRow({
  text,
  trigger,
}: {
  text?: string
  trigger: NativeTurnTrigger
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [open, setOpen] = useState(false)
  const label = triggerText(trigger)
  const row = (
    <>
      <NativeIcon name={TRIGGER_ICONS[trigger]} size={13} color={theme.colors.inkTertiary} />
      <Text style={s.label}>{label}</Text>
    </>
  )
  if (text === undefined)
    return (
      <Pressable aria-hidden accessible={false} style={s.row}>
        {row}
      </Pressable>
    )
  return (
    <>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [s.row, pressed && s.pressed]}
      >
        {row}
        <NativeIcon name="chevron-right-outline" size={13} color={theme.colors.inkTertiary} />
      </Pressable>
      <NativeAnchoredPanel onClose={() => setOpen(false)} open={open}>
        <ScrollView contentContainerStyle={s.sheet}>
          <Text style={s.sheetTitle}>{label}</Text>
          <Text selectable style={s.body}>
            {text}
          </Text>
          <Pressable
            accessibilityLabel={message('conversation.copyTrigger')}
            accessibilityRole="button"
            onPress={() => {
              void Clipboard.setStringAsync(text).then(() => {
                tapFeedback()
                showSnackbar(message('copy.copiedText'))
              })
            }}
            style={({ pressed }) => [s.copy, pressed && s.pressed]}
          >
            <NativeIcon name="copy-outline" size={15} color={theme.colors.accent} />
            <Text style={s.copyText}>{message('copy.copyPayload')}</Text>
          </Pressable>
        </ScrollView>
      </NativeAnchoredPanel>
    </>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      minHeight: 28,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 2,
    },
    label: { color: theme.colors.inkTertiary, flex: 1, fontSize: 12, lineHeight: 18 },
    pressed: { opacity: 0.62 },
    sheet: { gap: 10, padding: 16 },
    sheetTitle: { color: theme.colors.ink, fontSize: 15, fontWeight: '600', lineHeight: 22 },
    body: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    copy: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 40 },
    copyText: { color: theme.colors.accent, fontSize: 14, lineHeight: 22 },
  })
