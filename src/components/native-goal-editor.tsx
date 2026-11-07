import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeActionButton } from '@/components/native-action-button'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

/** A native entry to the desktop's goals/create action; never inserts a fake local Goal. */
export function NativeGoalEditor({
  initial,
  open,
  pending,
  title,
  onClose,
  onCreate,
}: {
  /** Prefilled objective; an edit reuses this sheet instead of an inline field. */
  initial?: string
  open: boolean
  pending: boolean
  /** Sheet heading; defaults to the create wording. */
  title?: string
  onClose(): void
  onCreate(objective: string): Promise<void>
}): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  const theme = useAppTheme()
  const [draft, setDraft] = useState('')
  const [working, setWorking] = useState(false)
  const submitting = useRef(false)
  const busy = pending || working
  const close = (): void => {
    if (!pending && !submitting.current) onClose()
  }
  useEffect(() => {
    if (open) setDraft(initial ?? '')
  }, [initial, open])
  const save = async (): Promise<void> => {
    if (!open || pending || submitting.current || draft.trim() === '') return
    submitting.current = true
    setWorking(true)
    try {
      await onCreate(draft.trim())
      onClose()
    } catch {
      /* The command hook presents the failure; retain the draft. */
    } finally {
      submitting.current = false
      setWorking(false)
    }
  }
  return (
    <NativeAnchoredPanel open={open} onClose={close}>
      <View style={s.content}>
        <Text style={s.title}>{title ?? message('activity.createGoal')}</Text>
        <TextInput
          autoFocus
          multiline
          accessibilityLabel={message('activity.goalLabel')}
          placeholder={message('activity.createGoalPlaceholder')}
          placeholderTextColor={theme.colors.inkTertiary}
          selectionColor={theme.colors.accent}
          editable={!busy}
          value={draft}
          onChangeText={setDraft}
          style={s.input}
        />
        <View style={s.actions}>
          <NativeActionButton
            label={message('activity.saveGoal')}
            icon="check-outline"
            loading={busy}
            disabled={busy || draft.trim() === ''}
            onPress={() => void save()}
          />
          <NativeActionButton
            label={message('activity.cancelGoalEdit')}
            icon="close-outline"
            variant="secondary"
            disabled={busy}
            onPress={close}
          />
        </View>
      </View>
    </NativeAnchoredPanel>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: { padding: 16, gap: 12 },
    title: { color: theme.colors.ink, fontSize: 16, fontWeight: '500', lineHeight: 24 },
    input: {
      color: theme.colors.ink,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.radius.control,
      fontSize: 14,
      lineHeight: 22,
      minHeight: 88,
      maxHeight: 160,
      padding: 12,
      textAlignVertical: 'top',
    },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  })
