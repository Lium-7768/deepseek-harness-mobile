import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { NativeIcon } from '@/components/native-icon'
import {
  agentPresetLabel,
  composerInputPolicy,
  composerPrimaryAction,
  modelLabel,
  permissionLabel,
} from '@/components/session-composer-logic'
import type { MobileImageMediaType, MobileModelSelection, MobilePermissionSelect, MobilePromptContent } from '@/types/mobile'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { format, t as message } from '@/locale'

type DraftImage = {
  data: string
  mediaType: MobileImageMediaType
  name?: string
  uri: string
}

type Props = {
  agentPreset?: string
  cancelling?: boolean
  disabled?: boolean
  model?: MobileModelSelection
  onCancel?: () => void
  onSend: (content: MobilePromptContent) => void | Promise<void>
  permissions?: MobilePermissionSelect
  placeholder?: string
  running?: boolean
  sending?: boolean
  sessionId?: string
}

/**
 * Sends text prompts and exposes controls backed by the session APIs.
 *
 * Agent mode and model open native detail routes which submit
 * `agentPreset.select` and `session.selectModel`. Permission choices are
 * shown only when the history projection is present; that projection is the
 * host's durable permission state, and the detail route submits the existing
 * `/permission <preset>` session command. Unsupported controls remain visibly
 * disabled instead of changing local state without a desktop acknowledgement.
 *
 * @param props - Prompt callback, session identity, and host projections.
 * @returns The native prompt composer.
 */
export function WorkspaceComposer({
  agentPreset,
  cancelling = false,
  disabled = false,
  model,
  onCancel,
  onSend,
  permissions,
  placeholder = message('composer.placeholder'),
  running = false,
  sending = false,
  sessionId,
}: Props): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [draftImages, setDraftImages] = useState<DraftImage[]>([])
  const hasContent = text.trim() !== '' || draftImages.length > 0
  const action = composerPrimaryAction({ cancelling, disabled, hasText: hasContent, running, sending })
  const send = async (): Promise<void> => {
    const value = text.trim()
    if (action.kind !== 'send' || action.disabled || !hasContent) return
    const content: MobilePromptContent = [
      ...(value ? [{ type: 'text' as const, text: value }] : []),
      ...draftImages.map(({ data, mediaType, name }) => ({
        type: 'image' as const,
        data,
        mediaType,
        ...(name ? { name } : {}),
      })),
    ]
    try {
      await onSend(content)
      setText('')
      setDraftImages([])
    } catch {
      // The request owner presents the error; keeping the draft makes retry safe.
    }
  }
  const appendImages = (assets: ImagePicker.ImagePickerAsset[]): void => {
    const selected = assets.slice(0, 4 - draftImages.length).flatMap((asset) => {
      if (!asset.base64) return []
      return [
        {
          data: asset.base64,
          // Both camera and library requests ask Expo for a compressed JPEG base64 payload.
          mediaType: 'image/jpeg' as const,
          ...(asset.fileName ? { name: asset.fileName } : {}),
          uri: asset.uri,
        },
      ]
    })
    if (selected.length === 0) {
      Alert.alert(message('composer.imageAddFailedTitle'), message('composer.imageAddFailedBody'))
      return
    }
    setDraftImages(current => [...current, ...selected].slice(0, 4))
  }
  const pickImage = async (): Promise<void> => {
    if (controlsDisabled || draftImages.length >= 4) return
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        base64: true,
        mediaTypes: ['images'],
        quality: 0.85,
        selectionLimit: 4 - draftImages.length,
      })
      if (!result.canceled) appendImages(result.assets)
    } catch {
      Alert.alert(message('composer.photoLibraryFailedTitle'), message('composer.photoLibraryFailedBody'))
    }
  }
  const captureImage = async (): Promise<void> => {
    if (controlsDisabled || draftImages.length >= 4) return
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(message('composer.cameraPermissionTitle'), message('composer.cameraPermissionBody'))
        return
      }
      const result = await ImagePicker.launchCameraAsync({ base64: true, mediaTypes: ['images'], quality: 0.85 })
      if (!result.canceled) appendImages(result.assets)
    } catch {
      Alert.alert(message('composer.cameraFailedTitle'), message('composer.cameraFailedBody'))
    }
  }
  const chooseImageSource = (): void => {
    if (controlsDisabled || draftImages.length >= 4) return
    Alert.alert(message('composer.addImage'), message('composer.addImageDetail'), [
      { text: message('composer.takePhoto'), onPress: () => void captureImage() },
      { text: message('composer.choosePhoto'), onPress: () => void pickImage() },
      { text: message('common.cancel'), style: 'cancel' },
    ])
  }
  const hasSession = sessionId !== undefined && sessionId.length > 0
  const modeLabel = agentPresetLabel(agentPreset)
  const selectedModelLabel = modelLabel(model)
  const selectedPermissionLabel =
    permissions === undefined ? message('session.permissionWorkspaceBadge') : permissionLabel(permissions.currentValue, permissions)
  const controlsDisabled = disabled || sending || cancelling

  return (
    <View style={s.wrap}>
      {draftImages.length > 0 ? (
        <View accessibilityLabel={format('composer.imagesAdded', { count: draftImages.length })} style={s.previewRow}>
          {draftImages.map((image, index) => (
            <View key={`${image.uri}-${index}`} style={s.preview}>
              <Image accessibilityLabel={image.name ?? format('composer.attachmentImage', { index: index + 1 })} source={{ uri: image.uri }} style={s.previewImage} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={format('composer.removeAttachment', { index: index + 1 })}
                hitSlop={12}
                onPress={() => setDraftImages(current => current.filter((_, itemIndex) => itemIndex !== index))}
                style={({ pressed }) => [s.removePreview, pressed && s.pressed]}
              >
                <NativeIcon name="close-outline" size={13} color={theme.colors.onScrim} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View style={[s.row, focused && s.rowFocused]}>
        <TextInput
          accessibilityLabel={message('composer.inputLabel')}
          multiline
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.inkFaint}
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          style={s.input}
          textAlignVertical="top"
          editable={!controlsDisabled}
          returnKeyType={composerInputPolicy.returnKeyType}
          submitBehavior={composerInputPolicy.submitBehavior}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={draftImages.length >= 4 ? message('composer.imageLimitTitle') : message('composer.imageLimitBody')}
          accessibilityState={{ disabled: controlsDisabled || draftImages.length >= 4 }}
          disabled={controlsDisabled || draftImages.length >= 4}
          hitSlop={4}
          onPress={chooseImageSource}
          style={({ pressed }) => [
            s.icon,
            (controlsDisabled || draftImages.length >= 4) && s.iconDisabled,
            pressed && s.pressed,
          ]}
        >
          <NativeIcon
            name="paperclip-outline"
            size={21}
            color={controlsDisabled || draftImages.length >= 4 ? theme.colors.inkFaint : theme.colors.inkMuted}
          />
        </Pressable>
        {onCancel !== undefined && action.kind === 'stop' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.busy ? message('composer.stopping') : message('composer.stop')}
            accessibilityState={{ busy: action.busy, disabled: action.disabled }}
            disabled={action.disabled}
            hitSlop={5}
            onPress={onCancel}
            style={[s.send, action.disabled && s.sendDisabled]}
          >
            {action.busy ? <ActivityIndicator color={theme.colors.onBrand} /> : <NativeIcon name="stop-fill" size={16} color={theme.colors.onBrand} />}
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.busy ? message('composer.sending') : message('composer.send')}
            accessibilityState={{ busy: action.busy, disabled: action.disabled }}
            disabled={action.disabled}
            hitSlop={5}
            onPress={() => void send()}
            style={[s.send, action.disabled && s.sendDisabled]}
          >
            {action.busy ? <ActivityIndicator color={theme.colors.onBrand} /> : <NativeIcon name="paper-plane-outline" size={18} color={theme.colors.onBrand} />}
          </Pressable>
        )}
      </View>
      <ScrollView contentContainerStyle={s.tools} horizontal showsHorizontalScrollIndicator={false}>
        {permissions === undefined ? (
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={message('composer.permissionLocked')}
            accessibilityState={{ disabled: true }}
            style={s.disabledTool}
          >
            <NativeIcon name="shield-outline" size={14} color={theme.colors.inkMuted} />
            <Text style={s.toolText}>{message('session.permissionWorkspaceBadge')}</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={format('composer.selectPermission', { label: selectedPermissionLabel })}
            accessibilityState={{ disabled: !hasSession || controlsDisabled }}
            disabled={!hasSession || controlsDisabled}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => {
              if (hasSession && sessionId !== undefined)
                router.push({ pathname: '/session/[sessionId]/permission', params: { sessionId } })
            }}
            style={({ pressed }) => [s.tool, controlsDisabled && s.disabledTool, pressed && s.pressed]}
          >
            <NativeIcon name="shield-outline" size={14} color={theme.colors.inkMuted} />
            <Text numberOfLines={1} style={s.toolText}>
              {selectedPermissionLabel}
            </Text>
            <NativeIcon name="chevron-down-outline" size={13} color={theme.colors.inkMuted} />
          </Pressable>
        )}
        {hasSession ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={format('composer.selectMode', { label: modeLabel })}
            accessibilityState={{ disabled: controlsDisabled }}
            disabled={controlsDisabled}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => {
              if (sessionId !== undefined) router.push({ pathname: '/session/[sessionId]/mode', params: { sessionId } })
            }}
            style={({ pressed }) => [s.tool, controlsDisabled && s.disabledTool, pressed && s.pressed]}
          >
            <NativeIcon name="sliders-two-outline" size={14} color={theme.colors.inkMuted} />
            <Text numberOfLines={1} style={s.toolText}>
              {modeLabel}
            </Text>
            <NativeIcon name="chevron-down-outline" size={13} color={theme.colors.inkMuted} />
          </Pressable>
        ) : (
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={message('composer.modeNeedsSession')}
            accessibilityState={{ disabled: true }}
            style={s.disabledTool}
          >
            <NativeIcon name="sliders-two-outline" size={14} color={theme.colors.inkMuted} />
            <Text style={s.toolText}>{message('session.modeStandard')}</Text>
          </View>
        )}
        {hasSession ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={format('composer.selectModel', { label: selectedModelLabel })}
            accessibilityState={{ disabled: controlsDisabled }}
            disabled={controlsDisabled}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => {
              if (sessionId !== undefined)
                router.push({ pathname: '/session/[sessionId]/model', params: { sessionId } })
            }}
            style={({ pressed }) => [s.tool, controlsDisabled && s.disabledTool, pressed && s.pressed]}
          >
            <NativeIcon name="agent-preset-outline" size={14} color={theme.colors.inkMuted} />
            <Text numberOfLines={1} style={s.toolText}>
              {selectedModelLabel}
            </Text>
            <NativeIcon name="chevron-down-outline" size={13} color={theme.colors.inkMuted} />
          </Pressable>
        ) : (
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={message('composer.modelNeedsSession')}
            accessibilityState={{ disabled: true }}
            style={s.disabledTool}
          >
            <NativeIcon name="agent-preset-outline" size={14} color={theme.colors.inkMuted} />
            <Text style={s.toolText}>{message('composer.modelLocked')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: theme.colors.canvas,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
    },
    previewRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
    preview: { height: 58, position: 'relative', width: 58 },
    previewImage: { borderRadius: theme.radius.control, height: 58, width: 58 },
    removePreview: {
      alignItems: 'center',
      backgroundColor: theme.colors.controlOnMedia,
      borderColor: theme.colors.canvas,
      borderRadius: 10,
      borderWidth: 1,
      height: 20,
      justifyContent: 'center',
      position: 'absolute',
      right: -5,
      top: -5,
      width: 20,
    },
    row: {
      alignItems: 'flex-end',
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.chrome.composerRadius,
      borderWidth: 1,
      flexDirection: 'row',
      // 8pt between the field and each control, and the field may shrink rather
      // than push a control out of the card.
      gap: 8,
      minHeight: 58,
      paddingLeft: theme.spacing.md,
    },
    // The desktop paints a 2px ring in state-business-primary for keyboard focus
    // (ui-theme/styles/focus.css:3,9). RN's outline* props draw the same ring
    // outside the border box, so nothing shifts when it appears.
    rowFocused: { outlineColor: theme.colors.accent, outlineWidth: 2 },
    input: {
    color: theme.colors.ink,
    flex: 1,
    minWidth: 0,
    fontSize: theme.typography.message,
    lineHeight: theme.typography.lineMessage,
    maxHeight: 120,
    minHeight: 28,
    paddingVertical: 6,
  },
    icon: {
      alignItems: 'center',
      height: theme.touch.iconButton,
      justifyContent: 'center',
      width: theme.touch.iconButton,
    },
    iconDisabled: { opacity: 0.55 },
    send: {
      alignItems: 'center',
      backgroundColor: theme.colors.brand,
      borderRadius: theme.radius.pill,
      height: theme.touch.iconButton,
      justifyContent: 'center',
      margin: 5,
      width: theme.touch.iconButton,
    },
    sendDisabled: { backgroundColor: theme.colors.borderStrong },
    // DSH Pocket lets the composer's control row wrap with a 6px gap: a plugin can
    // add non-shrinking controls here, and a locked single line squeezed them out.
    tools: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingRight: 12, paddingTop: 8 },
    tool: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      gap: 4,
      flexShrink: 0,
      minHeight: 28,
      paddingHorizontal: 8,
    },
    disabledTool: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      gap: 4,
      flexShrink: 0,
      minHeight: 28,
      opacity: 0.5,
      paddingHorizontal: 8,
    },
    toolText: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 13, fontWeight: '500' },
    pressed: { opacity: 0.62 },
  })
