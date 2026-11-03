import { composerLayout } from './native-layout'
import { NativeIcon } from '@/components/native-icon'
import { NativeMenuPanel, type NativeMenuGroup, type NativeMenuNotice } from '@/components/native-menu-panel'
import { NativeModelPicker } from '@/components/native-model-picker'
import {
  agentPresetLabel,
  agentPresetName,
  composerInputPolicy,
  composerPrimaryAction,
  modelLabel,
  permissionDescription,
  permissionLabel,
} from '@/components/session-composer-logic'
import { format, t as message } from '@/locale'
import { useComposerDraftStore } from '@/state/composer-drafts'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type {
  MobileAgentPresetEntry,
  MobileImageMediaType,
  MobileModelProviderGroup,
  MobileModelSelection,
  MobilePermissionSelect,
  MobilePromptContent,
} from '@/types/mobile'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'

type DraftImage = {
  data: string
  mediaType: MobileImageMediaType
  name?: string
  uri: string
}

type Props = {
  variant?: 'hero' | 'docked'
  draftScope?: string
  agentPreset?: string
  cancelling?: boolean
  disabled?: boolean
  /** Rendered below the card, inside the same bottom padding (the Web's `.dock`). */
  footer?: React.ReactNode
  /** Context strip docked immediately above the input card. */
  header?: React.ReactNode
  model?: MobileModelSelection
  onCancel?: () => void
  /** Opens the goal surface; omission hides that menu row. */
  onOpenGoal?: () => void
  /** Commits one permission preset; omission locks the picker. */
  onSelectPermission?: (preset: string) => void | Promise<void>
  /** Commits one Agent preset; omission hides the mode picker. */
  onSelectMode?: (agentPreset: string) => void | Promise<void>
  /** Commits one model route; omission means this session has no model route. */
  onSelectModel?: (selection: MobileModelSelection) => void | Promise<void>
  onSend: (content: MobilePromptContent) => void | Promise<void>
  /** Agent presets the mode picker offers; omitted while the catalog loads. */
  presets?: MobileAgentPresetEntry[]
  /** Provider/model catalog the model picker offers. */
  modelCatalog?: MobileModelProviderGroup[]
  /** `true` while the permission projection is missing or the session is busy. */
  permissionLocked?: boolean
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
  footer,
  header,
  model,
  onCancel,
  onOpenGoal,
  onSelectMode,
  onSelectModel,
  onSelectPermission,
  onSend,
  modelCatalog,
  permissionLocked = false,
  permissions,
  presets,
  placeholder = message('composer.placeholder'),
  running = false,
  sending = false,
  sessionId,
  variant = 'docked',
  draftScope,
}: Props): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const { width, height, fontScale } = useWindowDimensions()
  const layout = composerLayout(width, fontScale)
  const draftKey = draftScope ?? sessionId ?? 'workspace'
  const text = useComposerDraftStore((state) => state.drafts[draftKey] ?? '')
  const setDraft = useComposerDraftStore((state) => state.setDraft)
  const setText = (value: string): void => setDraft(draftKey, value)
  const [inputHeight, setInputHeight] = useState(0)
  const [focused, setFocused] = useState(false)
  // One surface at a time: every trigger in the control row and dock opens the
  // same menu, so they share one open state instead of three navigation targets.
  const [openPicker, setOpenPicker] = useState<'add' | 'mode' | 'model' | 'permission' | undefined>(undefined)
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
      useComposerDraftStore.getState().clearSentDraft(draftKey, text)
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
    setDraftImages((current) => [...current, ...selected].slice(0, 4))
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
  // `ModelSelect` prints the model name in the secondary tone and the effort in
  // the caption tone beside it (`triggerEffort`, 13/20, `label-caption`).
  const modelName = model === undefined ? message('session.selectModel') : model.model
  const effortLabel = model?.reasoningEffort
  const selectedPermissionLabel =
    permissions === undefined
      ? message('session.permissionWorkspaceBadge')
      : permissionLabel(permissions.currentValue, permissions)
  const controlsDisabled = disabled || sending || cancelling
  const submitting = sending || cancelling
  // `ModelSelect`'s effort pane lists the selected model's own efforts.
  const selectedModelEntry = (modelCatalog ?? [])
    .flatMap((group) => group.models)
    .find((item) => item.id === model?.model)
  const effortsOfSelected = (selectedModelEntry?.reasoning?.efforts ?? []).map((effort) => effort.id)

  // The three pickers print the same rows the Web's `Menu` primitive does: the
  // projection's own options, with the current value checked.
  const permissionGroups: NativeMenuGroup[] = [
    {
      options: (permissions?.options ?? [])
        .filter((option) => option.value !== 'custom')
        .map((option) => ({
          description: option.description ?? permissionDescription(option.value),
          disabled: permissionLocked,
          icon: 'shield-outline' as const,
          label: permissionLabel(option.value, permissions ?? option.value),
          selected: option.value === permissions?.currentValue,
          value: option.value,
        })),
    },
  ]
  const permissionNotice: NativeMenuNotice | undefined = permissionLocked
    ? { text: message('permission.lockedWhileRunning') }
    : permissions === undefined
      ? { text: message('permission.noProjection') }
      : undefined
  const modeGroups: NativeMenuGroup[] = [
    {
      options: (presets ?? [])
        .filter((preset) => preset.broken === undefined)
        .map((preset) => ({
          description: preset.description?.trim() || undefined,
          disabled: hasSession ? false : true,
          icon: 'agent-preset-outline' as const,
          label: agentPresetName(preset),
          selected: preset.id === (agentPreset ?? 'standard'),
          value: preset.id,
        })),
    },
  ]
  const modeNotice: NativeMenuNotice | undefined = hasSession ? undefined : { text: message('mode.needsSession') }
  const modelNotice: NativeMenuNotice | undefined = hasSession
    ? undefined
    : { text: message('composer.modelNeedsSession') }
  /**
   * Splits one model-menu value back into its route or effort, then commits it.
   *
   * @param value - `provider\0model` for a route, `\0effort` for a reasoning level.
   */
  const selectModelOption = (value: string): void => {
    const [provider, modelId] = value.split('\u0000')
    if (provider === '' && modelId !== undefined) {
      if (model !== undefined) void onSelectModel?.({ ...model, reasoningEffort: modelId })
      return
    }
    if (modelId !== undefined) {
      const entry = (modelCatalog ?? []).flatMap((group) => group.models).find((item) => item.id === modelId)
      const effort = entry?.reasoning?.defaultEffort
      void onSelectModel?.({ model: modelId, provider, ...(effort === undefined ? {} : { reasoningEffort: effort }) })
    }
  }

  // `ui-commands`: the add menu groups what the press can insert, then the
  // commands that change how the session runs.
  const addActions: Record<string, () => void> = {
    file: chooseImageSource,
    ...(onOpenGoal === undefined ? {} : { goal: onOpenGoal }),
    ...(onSelectPermission === undefined || permissions === undefined
      ? {}
      : { permission: () => setOpenPicker('permission') }),
    ...(onSelectMode === undefined ? {} : { mode: () => setOpenPicker('mode') }),
    ...(onSelectModel === undefined || !hasSession ? {} : { model: () => setOpenPicker('model') }),
  }
  const addGroups: NativeMenuGroup[] = [
    {
      options: [
        {
          description: message('composer.menuFileDetail'),
          icon: 'paperclip-outline' as const,
          label: message('composer.menuFile'),
          token: 'file',
          value: 'file',
        },
      ],
      title: message('composer.menuAddSection'),
    },
    {
      options: [
        ...(onOpenGoal === undefined
          ? []
          : [
              {
                description: message('composer.menuGoalDetail'),
                icon: 'goal-outline' as const,
                label: message('composer.menuGoal'),
                token: 'goal',
                value: 'goal',
              },
            ]),
        ...(onSelectPermission === undefined || permissions === undefined
          ? []
          : [
              {
                description: message('composer.menuPermissionDetail'),
                icon: 'shield-outline' as const,
                label: message('composer.menuPermission'),
                token: 'permission',
                value: 'permission',
              },
            ]),
        ...(onSelectMode === undefined
          ? []
          : [
              {
                description: message('composer.menuModeDetail'),
                icon: 'sliders-two-outline' as const,
                label: message('composer.menuMode'),
                token: 'mode',
                value: 'mode',
              },
            ]),
        ...(onSelectModel === undefined || !hasSession
          ? []
          : [
              {
                description: message('composer.menuModelDetail'),
                icon: 'data-outline' as const,
                label: message('composer.menuModel'),
                token: 'model',
                value: 'model',
              },
            ]),
      ],
      title: message('composer.menuCommandSection'),
    },
  ].filter((group) => group.options.length > 0)
  // `PermissionSelect.module.css` hides the access label below a 460px composer
  // row, leaving the glyph and chevron; the phone card is narrower than that.
  const compactControls = layout.compact

  return (
    <View style={s.wrap}>
      {header}
      <View style={s.stack}>
        {draftImages.length > 0 ? (
          <View accessibilityLabel={format('composer.imagesAdded', { count: draftImages.length })} style={s.previewRow}>
            {draftImages.map((image, index) => (
              <View key={`${image.uri}-${index}`} style={s.preview}>
                <Image
                  accessibilityLabel={image.name ?? format('composer.attachmentImage', { index: index + 1 })}
                  source={{ uri: image.uri }}
                  style={s.previewImage}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={format('composer.removeAttachment', { index: index + 1 })}
                  hitSlop={12}
                  onPress={() => setDraftImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  style={({ pressed }) => [s.removePreview, pressed && s.pressed]}
                >
                  <NativeIcon name="close-outline" size={13} color={theme.colors.onScrim} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <View style={[s.card, focused && s.cardFocused]}>
          <TextInput
            accessibilityLabel={message('composer.inputLabel')}
            multiline
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.inkFaint}
            onBlur={() => setFocused(false)}
            onFocus={() => setFocused(true)}
            style={[
              s.input,
              {
                minHeight: variant === 'hero' ? Math.max(60, layout.inputMinHeight) : layout.inputMinHeight,
                height: Math.max(
                  variant === 'hero' ? Math.max(60, layout.inputMinHeight) : layout.inputMinHeight,
                  Math.min(inputHeight, height * 0.3),
                ),
              },
            ]}
            onContentSizeChange={(event) => setInputHeight(event.nativeEvent.contentSize.height)}
            selectionColor={theme.colors.accent}
            underlineColorAndroid="transparent"
            textAlignVertical="top"
            editable={!controlsDisabled}
            returnKeyType={composerInputPolicy.returnKeyType}
            submitBehavior={composerInputPolicy.submitBehavior}
          />
          <View style={s.controlRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={message('composer.addContent')}
              accessibilityState={{ disabled: controlsDisabled, expanded: openPicker === 'add' }}
              disabled={controlsDisabled}
              hitSlop={8}
              onPress={() => setOpenPicker('add')}
              style={({ pressed }) => [s.add, controlsDisabled && s.iconDisabled, pressed && s.pressed]}
            >
              <NativeIcon name="plus-outline" size={14} color={theme.colors.ink} />
            </Pressable>
            <View style={s.tools}>
              {permissions === undefined ? (
                <View
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={message('composer.permissionLocked')}
                  accessibilityState={{ disabled: true }}
                  style={s.disabledTool}
                >
                  <NativeIcon name="shield-outline" size={14} color={theme.colors.inkMuted} />
                  {compactControls ? null : (
                    <Text style={s.toolLabel}>{message('session.permissionWorkspaceBadge')}</Text>
                  )}
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={format('composer.selectPermission', { label: selectedPermissionLabel })}
                  accessibilityState={{ disabled: !hasSession || controlsDisabled }}
                  disabled={!hasSession || controlsDisabled}
                  hitSlop={{ top: 8, bottom: 8 }}
                  onPress={() => setOpenPicker('permission')}
                  style={({ pressed }) => [
                    s.tool,
                    compactControls && s.toolFixed,
                    controlsDisabled && s.disabledTool,
                    pressed && s.pressed,
                  ]}
                >
                  <NativeIcon name="shield-outline" size={14} color={theme.colors.inkMuted} />
                  {compactControls ? null : (
                    <Text numberOfLines={1} style={s.toolLabel}>
                      {selectedPermissionLabel}
                    </Text>
                  )}
                  <NativeIcon name="chevron-down-outline" size={14} color={theme.colors.inkFaint} />
                </Pressable>
              )}
              {hasSession ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={format('composer.selectMode', { label: modeLabel })}
                  accessibilityState={{ disabled: controlsDisabled }}
                  disabled={controlsDisabled}
                  hitSlop={{ top: 8, bottom: 8 }}
                  onPress={() => setOpenPicker('mode')}
                  style={({ pressed }) => [
                    s.tool,
                    compactControls && s.toolFixed,
                    controlsDisabled && s.disabledTool,
                    pressed && s.pressed,
                  ]}
                >
                  <NativeIcon name="sliders-two-outline" size={14} color={theme.colors.inkMuted} />
                  {compactControls ? null : (
                    <Text numberOfLines={1} style={s.toolLabel}>
                      {modeLabel}
                    </Text>
                  )}
                  <NativeIcon name="chevron-down-outline" size={14} color={theme.colors.inkFaint} />
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
                  {compactControls ? null : <Text style={s.toolLabel}>{message('session.modeStandard')}</Text>}
                </View>
              )}
            </View>
            <View style={s.trailing}>
              {hasSession ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={format('composer.selectModel', { label: selectedModelLabel })}
                  accessibilityState={{ disabled: controlsDisabled }}
                  disabled={controlsDisabled}
                  hitSlop={{ top: 8, bottom: 8 }}
                  onPress={() => setOpenPicker('model')}
                  style={({ pressed }) => [
                    s.tool,
                    s.modelControl,
                    controlsDisabled && s.disabledTool,
                    pressed && s.pressed,
                  ]}
                >
                  <NativeIcon name="data-outline" size={14} color={theme.colors.inkMuted} />
                  {layout.iconModel ? null : (
                    <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={s.modelText}>
                      {modelName}
                    </Text>
                  )}
                  {layout.iconModel || effortLabel === undefined ? null : (
                    <Text numberOfLines={1} style={s.effortText}>
                      {effortLabel}
                    </Text>
                  )}
                  <NativeIcon name="chevron-down-outline" size={14} color={theme.colors.inkFaint} />
                </Pressable>
              ) : (
                <View
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={message('composer.modelNeedsSession')}
                  accessibilityState={{ disabled: true }}
                  style={[s.disabledTool, s.modelControl]}
                >
                  <NativeIcon name="data-outline" size={14} color={theme.colors.inkMuted} />
                  {layout.iconModel ? null : (
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={s.modelText}>
                      {message('composer.modelLocked')}
                    </Text>
                  )}
                </View>
              )}
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
                  {action.busy ? (
                    <ActivityIndicator color={theme.colors.onBrand} />
                  ) : (
                    <NativeIcon name="stop-fill" size={16} color={theme.colors.onBrand} />
                  )}
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
                  {action.busy ? (
                    <ActivityIndicator color={theme.colors.onAccent} />
                  ) : (
                    <NativeIcon name="arrow-up" size={16} color={theme.colors.onAccent} />
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
      <NativeMenuPanel
        actionMenu
        groups={addGroups}
        onClose={() => setOpenPicker(undefined)}
        onSelect={(value) => {
          const entry = addGroups.flatMap((group) => group.options).find((option) => option.value === value)
          if (entry !== undefined) addActions[value]?.()
        }}
        open={openPicker === 'add'}
        title={message('composer.addContent')}
      />
      <NativeMenuPanel
        groups={permissionGroups}
        notice={permissionNotice}
        onClose={() => setOpenPicker(undefined)}
        onSelect={(value) => void onSelectPermission?.(value)}
        open={openPicker === 'permission'}
        rowRole="select"
        title={message('permission.selectTitle')}
      />
      <NativeMenuPanel
        groups={modeGroups}
        notice={modeNotice}
        onClose={() => setOpenPicker(undefined)}
        onSelect={(value) => void onSelectMode?.(value)}
        open={openPicker === 'mode'}
        rowRole="select"
        title={message('mode.selectTitle')}
      />
      <NativeModelPicker
        disabled={submitting || !hasSession}
        effort={model?.reasoningEffort}
        efforts={effortsOfSelected}
        groups={modelCatalog ?? []}
        notice={modelNotice?.text}
        onClose={() => setOpenPicker(undefined)}
        onSelectEffort={(level) => {
          if (model !== undefined) void onSelectModel?.({ ...model, reasoningEffort: level })
        }}
        onSelectModel={(choice) => void selectModelOption(`${choice.provider}\u0000${choice.model}`)}
        open={openPicker === 'model'}
        selection={model === undefined ? undefined : { model: model.model, provider: model.provider }}
      />
      {footer === undefined ? null : <View style={s.footer}>{footer}</View>}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // `wqMmtW_root`: the card and the dock share one column with 6px between,
    // 16px side clearance and 4px below.
    wrap: { backgroundColor: theme.colors.canvas, paddingBottom: 4, paddingHorizontal: theme.spacing.lg },
    stack: { flexDirection: 'column', gap: 6 },
    footer: { flexDirection: 'column' },
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
    // `wqMmtW_card`: r28, `8px 0 0` top pad, 12px between the draft and the
    // control row, a white fill above the canvas, and the elevation hairline
    // instead of a drawn border (`--dsw-elevation-stroke-color: border-l2`).
    card: {
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: theme.radius.panel,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderL2,
      flexDirection: 'column',
      gap: 12,
      paddingTop: 8,
      ...theme.elevation.card,
    },
    // Native text focus strengthens the existing hairline without changing geometry.
    cardFocused: { borderColor: theme.colors.ghostActiveBorder },
    // `wqMmtW_input`: 16/24, `4px 8px 0 14px`, a 36pt docked floor.
    input: {
      color: theme.colors.ink,
      fontSize: 16,
      lineHeight: 24,
      maxHeight: 336,
      minHeight: 36,
      paddingBottom: 0,
      paddingHorizontal: 14,
      paddingTop: 4,
    },
    // `wqMmtW_row`: gap 12, `2px 8px 6px`, controls centred, trailing pinned right.
    controlRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'nowrap',
      justifyContent: 'space-between',
      minWidth: 0,
      paddingBottom: 8,
      paddingHorizontal: 8,
      paddingTop: 2,
    },
    // `wqMmtW_add`: a 28pt circle on the selector fill holding a 14pt plus.
    add: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      minHeight: 36,
      flexShrink: 0,
      justifyContent: 'center',
      width: 28,
    },
    iconDisabled: { opacity: 0.5 },
    // `wqMmtW_tools` / `wqMmtW_modes`: 8px apart inside the left cluster.
    tools: { alignItems: 'center', flexDirection: 'row', flexShrink: 0, gap: 4, minWidth: 0 },
    // `wqMmtW_trailing`: model + send, 8px apart, pinned to the right edge.
    // The trailing cluster gives way before the icon triggers do: the model name
    // ellipsizes (effort first, `ModelSelect .triggerEffort`), while the access
    // and mode controls keep their drawn 28pt boxes.
    trailing: { alignItems: 'center', flexDirection: 'row', flex: 1, gap: 6, minWidth: 0 },
    // `PermissionSelect.trigger` / `ModelSelect.trigger`: 28 tall, `0 4px 0 8px`,
    // r8, 4px between the glyph, labels and chevron.
    tool: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      flexShrink: 1,
      gap: 4,
      minHeight: 36,
      minWidth: 0,
      paddingLeft: 8,
      paddingRight: 4,
    },
    // With its label hidden the trigger holds only two 14pt glyphs, so it must
    // not be the row's shrink sink: a long model name would squeeze it to the
    // glyph alone and clip the chevron. The model trigger shrinks instead
    // (`ModelSelect .triggerEffort` does the same on the Web).
    toolFixed: { flexShrink: 0 },
    disabledTool: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      flexShrink: 0,
      gap: 4,
      minHeight: 36,
      opacity: 0.5,
      paddingLeft: 8,
      paddingRight: 4,
    },
    // Both triggers print 13/500 in label-secondary; only the model name steps
    // down to 400 and its effort value takes the caption tone.
    toolLabel: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    modelControl: { flex: 1 },
    modelText: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 13, fontWeight: '400', lineHeight: 20 },
    // `.triggerEffort` shrinks 1000× so it ellipsizes away before the name does.
    effortText: { color: theme.colors.inkFaint, flexShrink: 1000, fontSize: 13, lineHeight: 20, minWidth: 0 },
    // `wqMmtW_primary`: a 34pt circle on the info fill, lifted 2px against the row.
    send: {
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.pill,
      height: theme.chrome.sendButton,
      flexShrink: 0,
      justifyContent: 'center',
      transform: [{ translateY: -2 }],
      width: theme.chrome.sendButton,
    },
    // The desktop dims the same accent circle instead of recolouring it
    // (ui-conversation InputBar: `.primary:disabled { opacity: .4 }`).
    sendDisabled: { backgroundColor: theme.colors.accent, opacity: 0.4 },
    pressed: { opacity: 0.62 },
  })
