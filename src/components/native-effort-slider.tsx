import { EFFORT_THUMB_SIZE, effortIndexAtPosition, reasoningEffortLabel } from '@/components/model-picker-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileModelReasoningEffort } from '@/types/mobile'
import { useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

/** Preview while dragging; send one command only on release or an accessibility adjustment. */
export function NativeEffortSlider({
  choices,
  value,
  disabled,
  onPreview,
  onCommit,
}: {
  choices: readonly MobileModelReasoningEffort[]
  value?: string
  disabled: boolean
  onPreview(value: string | undefined): void
  onCommit(value: string): void
}): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [width, setWidth] = useState(0)
  const [preview, setPreview] = useState<number>()
  const dragging = useRef<number | undefined>(undefined)
  const selected = choices.findIndex((choice) => choice.id === value)
  const index = preview ?? selected
  const position = index < 0 ? 0 : index / Math.max(1, choices.length - 1)
  const travel = Math.max(0, width - EFFORT_THUMB_SIZE)
  const locked = disabled || choices.length < 2
  const update = (x: number): number => {
    const next = effortIndexAtPosition(x, width, choices.length)
    dragging.current = next
    setPreview(next)
    onPreview(choices[next]?.id)
    return next
  }
  const finish = (x: number): void => {
    if (dragging.current === undefined) return
    const next = update(x)
    dragging.current = undefined
    setPreview(undefined)
    onPreview(undefined)
    const choice = choices[next]
    if (!locked && choice && choice.id !== value) onCommit(choice.id)
  }
  const cancel = (): void => {
    dragging.current = undefined
    setPreview(undefined)
    onPreview(undefined)
  }
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={message('model.reasoningEffort')}
      accessibilityState={{ disabled: locked }}
      accessibilityValue={{
        min: 0,
        max: Math.max(0, choices.length - 1),
        now: Math.max(0, index),
        text: index < 0 ? message('model.providerDefault') : reasoningEffortLabel(choices[index].id, choices),
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (locked || (nativeEvent.actionName !== 'increment' && nativeEvent.actionName !== 'decrement')) return
        const next = Math.min(
          choices.length - 1,
          Math.max(0, selected + (nativeEvent.actionName === 'increment' ? 1 : -1)),
        )
        if (choices[next]?.id !== value) onCommit(choices[next].id)
      }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => !locked}
      onResponderGrant={(event) => {
        if (!locked) update(event.nativeEvent.locationX)
      }}
      onResponderMove={(event) => {
        if (!locked && dragging.current !== undefined) update(event.nativeEvent.locationX)
      }}
      onResponderRelease={(event) => finish(event.nativeEvent.locationX)}
      onResponderTerminate={cancel}
      onResponderTerminationRequest={() => false}
      style={[s.slider, disabled && s.disabled]}
    >
      <View pointerEvents="none" style={s.track}>
        {index < 0 ? null : <View style={[s.fill, { width: EFFORT_THUMB_SIZE / 2 + position * travel }]} />}
        {choices.map((choice, stop) => (
          <View
            key={choice.id}
            style={[
              s.dot,
              {
                left: EFFORT_THUMB_SIZE / 2 - 3 + (stop / Math.max(1, choices.length - 1)) * travel,
                backgroundColor: stop <= index ? theme.colors.onAccent : theme.colors.inkFaint,
              },
            ]}
          />
        ))}
      </View>
      {index < 0 ? null : <View pointerEvents="none" style={[s.thumb, { left: position * travel }]} />}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    slider: { height: 52, justifyContent: 'center', width: '100%' },
    track: {
      height: 34,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceActive,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill },
    dot: { position: 'absolute', top: 14, width: 6, height: 6, borderRadius: 3, opacity: 0.5 },
    thumb: {
      ...theme.elevation.card,
      position: 'absolute',
      top: 6,
      width: EFFORT_THUMB_SIZE,
      height: EFFORT_THUMB_SIZE,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderWidth: StyleSheet.hairlineWidth,
    },
    disabled: { opacity: 0.5 },
  })
