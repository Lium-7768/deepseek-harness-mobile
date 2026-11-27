import { useConversationDisclosure } from './conversation-disclosure'
import { tapFeedback } from '@/components/haptics'
import { NativeContextBody, type ContextContentBlock } from '@/components/native-context-body'
import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import { triggerText, type NativeTurnTrigger } from '@/components/session-conversation-logic'
import { formatMessageTime } from '@/components/session-message-logic'
import { t as message } from '@/locale'
import { showSnackbar } from '@/state/snackbar'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

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
 * Mirrors desktop `TurnTriggerNodeView.tsx` and `TurnTriggerNodeView.module.css`:
 * manual `continue` receipts render as a compact inline row without card chrome,
 * while ordinary recorded triggers render as a rounded `codeBackground` card whose
 * header shows icon, title, clock timestamp, and chevron, expanding inline to show
 * the explanation and a 240pt scrollable notice body.
 */
export function NativeTurnTriggerRow({
  contentBlocks,
  rowKey,
  source,
  text,
  time,
  trigger,
}: {
  contentBlocks?: readonly ContextContentBlock[]
  rowKey?: string
  source?: Readonly<Record<string, unknown>>
  text?: string
  time?: number
  trigger: NativeTurnTrigger
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [localOpen, setLocalOpen] = useState(false)
  const [storedOpen, toggleStored] = useConversationDisclosure(rowKey ?? `turn-trigger:${trigger}`)
  const open = rowKey !== undefined ? storedOpen : localOpen
  const toggle = rowKey !== undefined ? toggleStored : () => setLocalOpen((current) => !current)
  const label = triggerText(trigger)
  if (trigger === 'continue') {
    return (
      <View style={s.continuation}>
        <NativeIcon name={TRIGGER_ICONS[trigger]} size={14} color={theme.colors.inkTertiary} />
        <Text style={s.continuationLabel}>{label}</Text>
      </View>
    )
  }
  const hasPayload = text !== undefined || (contentBlocks !== undefined && contentBlocks.length > 0)
  const clock = time !== undefined ? formatMessageTime(time) : undefined
  const header = (
    <>
      <NativeIcon name={TRIGGER_ICONS[trigger]} size={14} color={theme.colors.inkTertiary} />
      <Text style={s.label}>{label}</Text>
      {clock === undefined ? null : (
        <Text numberOfLines={1} style={s.time}>
          {clock}
        </Text>
      )}
      {hasPayload ? (
        <NativeIcon
          name={open ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={12}
          color={theme.colors.inkTertiary}
        />
      ) : null}
    </>
  )
  if (!hasPayload) {
    return (
      <View style={s.root}>
        <View style={s.header}>{header}</View>
      </View>
    )
  }
  return (
    <View style={s.root}>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={({ pressed }) => [s.header, pressed && s.pressed]}
      >
        {header}
      </Pressable>
      {open ? (
        <View style={s.body}>
          <Text style={s.explanation}>{message('conversation.triggerExplanation')}</Text>
          <ScrollView nestedScrollEnabled style={s.contentScroll}>
            <NativeContextBody contentBlocks={contentBlocks} form="notice" source={source ?? null} text={text ?? ''} />
          </ScrollView>
          {text !== undefined && text !== '' ? (
            <Pressable
              accessibilityLabel={message('conversation.copyTrigger')}
              accessibilityRole="button"
              onPress={() => {
                void Clipboard.setStringAsync(text)
                  .then(() => {
                    tapFeedback()
                    showSnackbar(message('copy.copiedText'))
                  })
                  .catch(() => undefined)
              }}
              style={({ pressed }) => [s.copy, pressed && s.pressed]}
            >
              <NativeIcon name="copy-outline" size={14} color={theme.colors.accent} />
              <Text style={s.copyText}>{message('copy.copyPayload')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `TurnTriggerNodeView .continuation`: compact inline receipt for manual continue.
    continuation: { alignItems: 'center', flexDirection: 'row', gap: 6, minWidth: 0, paddingVertical: 2 },
    continuationLabel: { color: theme.colors.inkTertiary, flex: 1, fontSize: 13, lineHeight: 20 },
    // `TurnTriggerNodeView .root` + `.header`: rounded card on codeBackground with hairline border.
    root: {
      backgroundColor: theme.colors.codeBackground,
      borderColor: theme.colors.borderHairline,
      borderRadius: theme.radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      minWidth: 0,
      overflow: 'hidden',
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    label: { color: theme.colors.inkTertiary, flex: 1, fontSize: 14, lineHeight: 20, minWidth: 0 },
    time: { color: theme.colors.inkTertiary, flexShrink: 0, fontSize: 12, lineHeight: 16 },
    // `TurnTriggerNodeView .body`: 0 16px 12px 40px inline under the title.
    body: { paddingBottom: 12, paddingLeft: 40, paddingRight: 16 },
    explanation: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18, marginVertical: 8 },
    contentScroll: { maxHeight: 240 },
    copy: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginTop: 8, minHeight: 32 },
    copyText: { color: theme.colors.accent, fontSize: 12, lineHeight: 18 },
    pressed: { opacity: 0.62 },
  })
