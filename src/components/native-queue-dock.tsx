import { NativeIcon } from '@/components/native-icon'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobilePromptContent, MobileQueueItem } from '@/types/mobile'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

type Props = {
  items: readonly MobileQueueItem[]
  onUpdate: (itemId: string, action: Record<string, unknown>) => Promise<void>
  running: boolean
}

type Editing = { id: string; text: string } | undefined

/**
 * Native projection of the Web QueueDock. Items originate only from the
 * desktop-hosted `session/queue` mux snapshot; local state is limited to the
 * collapsed/editor control state required to operate that snapshot.
 */
export function NativeQueueDock({ items, onUpdate, running }: Props): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const queue = useMemo(() => items.filter((item) => item.placement === 'queued'), [items])
  const [collapsed, setCollapsed] = useState(true)
  const [editing, setEditing] = useState<Editing>()
  const [busyId, setBusyId] = useState<string | undefined>()

  useEffect(() => {
    if (queue.length === 0) {
      setCollapsed(true)
      setEditing(undefined)
      return
    }
    if (editing !== undefined && !queue.some((item) => item.id === editing.id)) setEditing(undefined)
  }, [editing, queue])

  if (queue.length === 0) return null
  const interactionActive = editing !== undefined || busyId !== undefined
  const expanded = !collapsed || interactionActive
  const listVisible = queue.length === 1 || expanded

  const apply = async (itemId: string, action: Record<string, unknown>, failure: string): Promise<boolean> => {
    setBusyId(itemId)
    try {
      await onUpdate(itemId, action)
      return true
    } catch {
      Alert.alert(message('queue.failedTitle'), failure)
      return false
    } finally {
      setBusyId((current) => (current === itemId ? undefined : current))
    }
  }

  const save = async (): Promise<void> => {
    if (editing === undefined || editing.text.trim() === '') return
    if (
      await apply(
        editing.id,
        { kind: 'edit', content: [{ type: 'text', text: editing.text.trim() }] satisfies MobilePromptContent },
        message('queue.cannotEdit'),
      )
    )
      setEditing(undefined)
  }

  return (
    <View style={s.dock}>
      {queue.length > 1 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={format('queue.summary', {
            count: queue.length,
            action: expanded ? message('queue.collapse') : message('queue.expand'),
          })}
          accessibilityState={{ expanded, disabled: interactionActive }}
          disabled={interactionActive}
          onPress={() => setCollapsed((value) => !value)}
          style={({ pressed }) => [s.header, pressed && s.pressed]}
        >
          <NativeIcon name="new-chat-outline" size={15} color={theme.colors.inkMuted} />
          <Text style={s.headerText}>{format('queue.header', { count: queue.length })}</Text>
          <NativeIcon
            name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={17}
            color={theme.colors.inkMuted}
          />
        </Pressable>
      ) : null}
      {listVisible ? (
        <View style={s.list}>
          {queue.map((item) => {
            const text = editableText(item)
            const isEditing = editing?.id === item.id
            const busy = busyId !== undefined
            return (
              <View key={item.id} style={s.row}>
                {queue.length === 1 ? (
                  <NativeIcon name="new-chat-outline" size={15} color={theme.colors.inkMuted} />
                ) : null}
                {isEditing ? (
                  <TextInput
                    accessibilityLabel={message('queue.edit')}
                    autoFocus
                    multiline
                    onChangeText={(value) => setEditing({ id: item.id, text: value })}
                    style={s.editor}
                    value={editing.text}
                  />
                ) : (
                  <Text numberOfLines={2} style={s.preview}>
                    {queuePreview(item)}
                  </Text>
                )}
                <View style={s.actions}>
                  {isEditing ? (
                    <>
                      <QueueAction
                        disabled={busy || editing.text.trim() === ''}
                        label={message('queue.save')}
                        icon="check-outline"
                        onPress={() => void save()}
                      />
                      <QueueAction
                        disabled={busy}
                        label={message('queue.cancelEdit')}
                        icon="close-outline"
                        onPress={() => setEditing(undefined)}
                      />
                    </>
                  ) : (
                    <>
                      <QueueAction
                        disabled={busy || text === undefined}
                        label={text === undefined ? message('queue.cannotEditWithAttachment') : message('queue.edit')}
                        icon="edit-outline"
                        onPress={() => {
                          if (text !== undefined) setEditing({ id: item.id, text })
                        }}
                      />
                      <QueueAction
                        disabled={busy}
                        label={message('queue.remove')}
                        icon="close-outline"
                        onPress={() => void apply(item.id, { kind: 'remove' }, message('queue.cannotRemove'))}
                      />
                      <QueueAction
                        disabled={busy || !running}
                        label={running ? message('queue.steer') : message('queue.steerUnavailable')}
                        icon="paper-plane-outline"
                        onPress={() => void apply(item.id, { kind: 'steer' }, message('queue.cannotSteer'))}
                      />
                    </>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

function QueueAction({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled: boolean
  icon: 'check-outline' | 'close-outline' | 'edit-outline' | 'paper-plane-outline'
  label: string
  onPress: () => void
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={5}
      onPress={onPress}
      style={({ pressed }) => [s.action, disabled && s.actionDisabled, pressed && s.pressed]}
    >
      <NativeIcon name={icon} size={15} color={theme.colors.inkMuted} />
    </Pressable>
  )
}

function editableText(item: MobileQueueItem): string | undefined {
  const { content } = item.message
  if (!content.every((part) => part.type === 'text')) return undefined
  return content.map((part) => part.text).join('')
}

function queuePreview(item: MobileQueueItem): string {
  const text = editableText(item)
  if (text !== undefined) return text
  return (
    item.message.content
      .map((part) => (part.type === 'text' ? part.text : message('queue.imagePlaceholder')))
      .join(' ')
      .trim() || message('queue.attachmentPlaceholder')
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    dock: {
      backgroundColor: theme.colors.surfaceMuted,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 4,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    header: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: theme.touch.minTarget },
    headerText: { color: theme.colors.inkTertiary, flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    list: { gap: 4 },
    row: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: theme.touch.minTarget },
    preview: { color: theme.colors.ink, flex: 1, fontSize: 13, lineHeight: 20 },
    editor: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.control,
      borderWidth: 1,
      color: theme.colors.ink,
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      maxHeight: 88,
      minHeight: 36,
      paddingHorizontal: 9,
      paddingVertical: 7,
    },
    actions: { alignItems: 'center', flexDirection: 'row', gap: 2 },
    action: { alignItems: 'center', height: 30, justifyContent: 'center', width: 30 },
    actionDisabled: { opacity: 0.4 },
    pressed: { opacity: 0.62 },
  })
