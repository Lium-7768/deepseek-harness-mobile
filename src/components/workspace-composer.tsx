import {
  ATTACHMENT_DRAFT_BUDGET_BYTES,
  MAX_ATTACHMENTS,
  attachmentBytes,
  attachmentsWithinBudget,
  formatAttachmentBytes,
} from '@/components/attachment-policy'
import type { DraftImage } from '@/components/composer-types'
import { tapFeedback } from '@/components/haptics'
import { prepareAttachment } from '@/components/image-attachments'
import { composerLayout } from '@/components/native-layout'
import { catalogModelLabel, selectedCatalogModel } from '@/components/session-selection-logic'
import { NativeIcon } from '@/components/native-icon'
import { NativeMenuPanel, type NativeMenuGroup, type NativeMenuNotice } from '@/components/native-menu-panel'
import { NativeModelPicker } from '@/components/native-model-picker'
import { NativeInputTriggerMenu } from '@/components/native-input-trigger-menu'
import { applyCommandPick, type CommandTrigger } from '@/components/input-trigger-logic'
import { NativePlanChip } from '@/components/native-plan-chip'
import type { PlanState } from '@/components/plan-logic'
import { reasoningEffortLabel } from '@/components/model-picker-logic'
import {
  agentPresetLabel,
  agentPresetName,
  composerInputPolicy,
  composerPrimaryAction,
  permissionDescription,
  permissionLabel,
} from '@/components/session-composer-logic'
import { format, t as message } from '@/locale'
import { useComposerDraftStore } from '@/state/composer-drafts'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import type {
  MobileAgentPresetEntry,
  MobileSessionModelsPayload,
  MobileCommandDescriptor,
  MobileModelSelection,
  MobilePermissionSelect,
  MobilePromptContent,
} from '@/types/mobile'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'

type Props = {
  variant?: 'hero' | 'docked'
  /** Delivery mode for a prompt sent while the agent is running. */
  busyEnter?: 'queue' | 'steer'
  draftScope?: string
  agentPreset?: string
  cancelling?: boolean
  disabled?: boolean
  /** The event stream is down: drafting stays open, sending does not. */
  offline?: boolean
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
  modelCatalog?: MobileSessionModelsPayload
  modelCatalogError?: boolean
  modelCatalogLoading?: boolean
  onRetryModels?: () => Promise<unknown>
  selectionPending?: boolean
  /** `true` while the permission projection is missing or the session is busy. */
  permissionLocked?: boolean
  permissions?: MobilePermissionSelect
  /** The session's `plan` projection; omission hides the plan chip. */
  plan?: PlanState
  /** Slash commands the `/` trigger menu offers; omission keeps the menu shut. */
  commands?: MobileCommandDescriptor[]
  placeholder?: string
  running?: boolean
  sending?: boolean
  sessionId?: string
}

/**
 * Sends text prompts and exposes controls backed by the session APIs.
 *
 * Native pickers commit the existing desktop preset/model APIs. Permission
 * choices come from the history projection; the shared selection hook confirms
 * full access and submits the existing `/permission <preset>` command. Unsupported controls remain visibly
 * disabled instead of changing local state without a desktop acknowledgement.
 *
 * @param props - Prompt callback, session identity, and host projections.
 * @returns The native prompt composer.
 */
export function WorkspaceComposer({
  agentPreset,
  busyEnter = 'queue',
  cancelling = false,
  disabled = false,
  offline = false,
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
  modelCatalogError = false,
  modelCatalogLoading = false,
  onRetryModels,
  selectionPending = false,
  commands,
  permissionLocked = false,
  permissions,
  plan,
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
  // The `/` menu follows the caret, not just the text, so a pick replaces the
  // exact token the user is typing.
  const [caret, setCaret] = useState(0)
  const [commandMenuDismissed, setCommandMenuDismissed] = useState(false)
  const [draftImages, setDraftImages] = useState<DraftImage[]>([])
  const modelTriggerRef = useRef<View>(null)
  const hasContent = text.trim() !== '' || draftImages.length > 0
  const action = composerPrimaryAction({ cancelling, disabled, hasText: hasContent, offline, running, sending })
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
      tapFeedback()
      await onSend(content)
      useComposerDraftStore.getState().clearSentDraft(draftKey, text)
      setDraftImages([])
    } catch {
      // The request owner presents the error; keeping the draft makes retry safe.
    }
  }
  /**
   * Shrinks the picked files before anything reaches the draft.
   *
   * The picker returns full-resolution files and the gateway refuses a body over 12 MB,
   * which four photos exceed once base64 inflates them by a third. Each image is
   * re-encoded on the device; the ones that no longer fit the draft budget are reported
   * instead of failing the send later.
   */
  const appendImages = async (assets: ImagePicker.ImagePickerAsset[]): Promise<void> => {
    const room = MAX_ATTACHMENTS - draftImages.length
    if (room <= 0) return
    const prepared = await Promise.all(
      assets.slice(0, room).map((asset) =>
        prepareAttachment({
          ...(asset.width === null ? {} : { width: asset.width }),
          ...(asset.height === null ? {} : { height: asset.height }),
          ...(asset.fileName ? { name: asset.fileName } : {}),
          uri: asset.uri,
        }).catch(() => undefined),
      ),
    )
    const usable = prepared.filter((image): image is DraftImage => image !== undefined)
    if (usable.length === 0) {
      Alert.alert(message('composer.imageAddFailedTitle'), message('composer.imageAddFailedBody'))
      return
    }
    const accepted: DraftImage[] = []
    let skipped = assets.length - usable.length
    for (const image of usable) {
      if (attachmentsWithinBudget([...draftImages, ...accepted, image])) accepted.push(image)
      else skipped += 1
    }
    if (accepted.length > 0) setDraftImages((current) => [...current, ...accepted].slice(0, MAX_ATTACHMENTS))
    if (skipped > 0)
      Alert.alert(
        message('composer.imageSkippedTitle'),
        format('composer.imageSkippedBody', {
          count: skipped,
          limit: formatAttachmentBytes(ATTACHMENT_DRAFT_BUDGET_BYTES),
        }),
      )
    if (accepted.length > 0) tapFeedback()
  }
  const pickImage = async (): Promise<void> => {
    if (controlsDisabled || draftImages.length >= MAX_ATTACHMENTS) return
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        base64: false,
        mediaTypes: ['images'],
        quality: 1,
        selectionLimit: MAX_ATTACHMENTS - draftImages.length,
      })
      if (!result.canceled) await appendImages(result.assets)
    } catch {
      Alert.alert(message('composer.photoLibraryFailedTitle'), message('composer.photoLibraryFailedBody'))
    }
  }
  const captureImage = async (): Promise<void> => {
    if (controlsDisabled || draftImages.length >= MAX_ATTACHMENTS) return
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(message('composer.cameraPermissionTitle'), message('composer.cameraPermissionBody'))
        return
      }
      const result = await ImagePicker.launchCameraAsync({ base64: false, mediaTypes: ['images'], quality: 1 })
      if (!result.canceled) await appendImages(result.assets)
    } catch {
      Alert.alert(message('composer.cameraFailedTitle'), message('composer.cameraFailedBody'))
    }
  }
  const chooseImageSource = (): void => {
    if (controlsDisabled || draftImages.length >= MAX_ATTACHMENTS) return
    Alert.alert(message('composer.addImage'), message('composer.addImageDetail'), [
      { text: message('composer.takePhoto'), onPress: () => void captureImage() },
      { text: message('composer.choosePhoto'), onPress: () => void pickImage() },
      { text: message('common.cancel'), style: 'cancel' },
    ])
  }
  const hasSession = sessionId !== undefined && sessionId.length > 0
  const modeLabel = agentPresetLabel(agentPreset)
  const modelName =
    model === undefined ? message('session.selectModel') : catalogModelLabel(modelCatalog?.groups ?? [], model)
  const selectedModelEntry = selectedCatalogModel(modelCatalog?.groups ?? [], model)
  const effectiveEffort = model?.reasoningEffort ?? selectedModelEntry?.reasoning?.defaultEffort
  const effortLabel =
    effectiveEffort === undefined
      ? undefined
      : reasoningEffortLabel(effectiveEffort, selectedModelEntry?.reasoning?.efforts ?? [])
  const selectedModelLabel = [modelName, effortLabel].filter(Boolean).join(' · ')
  const selectedPermissionLabel =
    permissions === undefined
      ? message('session.permissionWorkspaceBadge')
      : permissionLabel(permissions.currentValue, permissions)
  const controlsDisabled = disabled || sending || cancelling || selectionPending
  const submitting = sending || cancelling || selectionPending

  // The three pickers print the same rows the Web's `Menu` primitive does: the
  // projection's own options, with the current value checked.
  const permissionGroups: NativeMenuGroup[] = [
    {
      options: (permissions?.options ?? [])
        .filter((option) => option.value !== 'custom')
        .map((option) => ({
          description: option.description ?? permissionDescription(option.value),
          disabled: permissionLocked || submitting || option.value === permissions?.currentValue,
          busy: selectionPending && option.value !== permissions?.currentValue,
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
          disabled: !hasSession || submitting,
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
  const selectModelOption = (choice: { provider: string; model: string }): void => {
    if (controlsDisabled || !hasSession) return
    const entry = selectedCatalogModel(modelCatalog?.groups ?? [], choice)
    if (entry === undefined) return
    const effort = entry.reasoning?.defaultEffort
    void onSelectModel?.({ ...choice, ...(effort === undefined ? {} : { reasoningEffort: effort }) })
  }

  // `ui-commands`: the add menu groups what the press can insert, then the
  // commands that change how the session runs.
  const addActions: Record<string, () => void> = {
    file: chooseImageSource,
    ...(onOpenGoal === undefined ? {} : { goal: onOpenGoal }),
    ...(onSelectPermission === undefined || permissions === undefined || !hasSession
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
        ...(onSelectPermission === undefined || permissions === undefined || !hasSession
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
      {header === undefined ? null : <View style={s.constrained}>{header}</View>}
      <View style={[s.stack, s.constrained]}>
        <View style={[s.card, focused && s.cardFocused]}>
          {draftImages.length > 0 ? (
            <View
              accessibilityLabel={format('composer.imagesAdded', {
                count: draftImages.length,
                size: formatAttachmentBytes(attachmentBytes(draftImages)),
              })}
              style={s.previewRow}
            >
              {draftImages.map((image, index) => (
                <View key={`${image.uri}-${index}`} style={s.preview}>
                  <Image
                    accessibilityLabel={image.name ?? format('composer.attachmentImage', { index: index + 1 })}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    source={{ uri: image.uri }}
                    style={s.previewImage}
                  />
                  <Pressable
                    android_ripple={{ borderless: false }}
                    accessibilityRole="button"
                    accessibilityLabel={format('composer.removeAttachment', { index: index + 1 })}
                    hitSlop={12}
                    onPress={() => setDraftImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    style={({ pressed }) => [s.removePreview, pressed && s.pressed]}
                  >
                    <NativeIcon name="close-outline" size={12} color={theme.colors.onScrim} />
                  </Pressable>
                </View>
              ))}
              <Text maxFontSizeMultiplier={1.3} style={s.previewSize}>
                {formatAttachmentBytes(attachmentBytes(draftImages))}
              </Text>
            </View>
          ) : null}
          <TextInput
            accessibilityLabel={message('composer.inputLabel')}
            multiline
            value={text}
            onChangeText={(value) => {
              setText(value)
              setCommandMenuDismissed(false)
            }}
            onSelectionChange={(event) => setCaret(event.nativeEvent.selection.start)}
            placeholder={offline && text === '' ? message('composer.offlinePlaceholder') : placeholder}
            placeholderTextColor={theme.colors.inkFaint}
            onBlur={() => setFocused(false)}
            onFocus={() => setFocused(true)}
            style={[
              s.input,
              {
                // `InputBar .hero .input`: the hero keeps a two-line floor
                // (2 x 24 line + 4pt = 52); the docked card collapses to content.
                minHeight: variant === 'hero' ? Math.max(52, layout.inputMinHeight) : layout.inputMinHeight,
                height: Math.max(
                  variant === 'hero' ? Math.max(52, layout.inputMinHeight) : layout.inputMinHeight,
                  Math.min(inputHeight, height * 0.3, 336),
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
              android_ripple={{ borderless: false }}
              accessibilityRole="button"
              accessibilityLabel={message('composer.addContent')}
              accessibilityState={{ disabled: controlsDisabled, expanded: openPicker === 'add' }}
              disabled={controlsDisabled}
              hitSlop={8}
              onPress={() => setOpenPicker('add')}
              style={({ pressed }) => [s.add, controlsDisabled && s.iconDisabled, pressed && s.pressed]}
            >
              <NativeIcon name="plus-outline" weight="medium" size={14} color={theme.colors.ink} />
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
                  android_ripple={{ borderless: false }}
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
                <NativePlanChip
                  locked={controlsDisabled}
                  onExit={async () => {
                    try {
                      await onSend([{ type: 'text', text: '/plan off' }])
                      return null
                    } catch (reason) {
                      return reason instanceof Error ? reason.message : String(reason)
                    }
                  }}
                  plan={plan}
                />
              ) : null}
              {hasSession ? (
                <Pressable
                  android_ripple={{ borderless: false }}
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
              {selectionPending ? (
                <ActivityIndicator
                  accessibilityLabel={message('composer.switching')}
                  size="small"
                  color={theme.colors.inkMuted}
                />
              ) : null}
              {hasSession ? (
                <Pressable
                  android_ripple={{ borderless: false }}
                  ref={modelTriggerRef}
                  accessibilityRole="button"
                  accessibilityLabel={format('composer.selectModel', { label: selectedModelLabel })}
                  accessibilityState={{ disabled: controlsDisabled, expanded: openPicker === 'model' }}
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
                  {layout.iconModel ? <NativeIcon name="data-outline" size={14} color={theme.colors.inkMuted} /> : null}
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
                  <NativeIcon
                    name={openPicker === 'model' ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={14}
                    color={theme.colors.inkFaint}
                  />
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
                  android_ripple={{ borderless: false }}
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
                  android_ripple={{ borderless: false }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    offline
                      ? message('composer.offlineSendLabel')
                      : action.busy
                        ? message('composer.sending')
                        : running && hasContent
                          ? message(busyEnter === 'steer' ? 'composer.sendSteer' : 'composer.sendQueue')
                          : message('composer.send')
                  }
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
          addActions[value]?.()
        }}
        open={openPicker === 'add'}
        title={message('composer.addContent')}
      />
      <NativeMenuPanel
        groups={permissionGroups}
        notice={permissionNotice}
        onClose={() => setOpenPicker(undefined)}
        onSelect={(value) => {
          if (!controlsDisabled && !permissionLocked && hasSession && value !== permissions?.currentValue)
            void onSelectPermission?.(value)
        }}
        open={openPicker === 'permission'}
        rowRole="select"
        title={message('permission.selectTitle')}
      />
      <NativeMenuPanel
        groups={modeGroups}
        notice={modeNotice}
        onClose={() => setOpenPicker(undefined)}
        onSelect={(value) => {
          if (!controlsDisabled && hasSession && value !== (agentPreset ?? 'standard')) void onSelectMode?.(value)
        }}
        open={openPicker === 'mode'}
        rowRole="select"
        title={message('mode.selectTitle')}
      />
      {commands === undefined || commandMenuDismissed ? null : (
        <NativeInputTriggerMenu
          caret={caret}
          commands={commands}
          onClose={() => setCommandMenuDismissed(true)}
          onPick={(command: MobileCommandDescriptor, trigger: CommandTrigger) => {
            const next = applyCommandPick(text, trigger, command.name)
            setText(next.text)
            setCaret(next.caret)
            setCommandMenuDismissed(true)
          }}
          text={text}
        />
      )}
      <NativeModelPicker
        anchorRef={modelTriggerRef}
        disabled={controlsDisabled || !hasSession || onSelectModel === undefined}
        effort={model?.reasoningEffort}
        groups={modelCatalog?.groups ?? []}
        failures={modelCatalog?.failures ?? []}
        routable={modelCatalog?.routable}
        loading={modelCatalogLoading}
        failed={modelCatalogError}
        onRetry={onRetryModels}
        notice={modelNotice?.text}
        onClose={() => setOpenPicker(undefined)}
        onSelectEffort={(level) => {
          if (model !== undefined && !controlsDisabled && level !== model.reasoningEffort)
            void onSelectModel?.({ ...model, reasoningEffort: level })
        }}
        onSelectModel={selectModelOption}
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
    // `--dsh-composer-card-max-width` caps the column at the chat width plus 32
    // (clamp 680..920 + 32 = 952); a phone never reaches it, a tablet would.
    constrained: { alignSelf: 'center', maxWidth: 952, width: '100%' },
    stack: { flexDirection: 'column', gap: 6 },
    footer: { flexDirection: 'column' },
    // `ComposerAttachments .rail`: `2px 10px 0` with a -6 bottom pull, so the
    // thumbnails sit closer to the draft than the card's own 12px gap.
    previewRow: { flexDirection: 'row', gap: 10, marginBottom: -6, paddingHorizontal: 10, paddingTop: 2 },
    // The encoded size sits at the end of the rail, level with the thumbnails' baseline:
    // it answers the only question a phone can raise about an attachment before sending.
    previewSize: {
      alignSelf: 'center',
      color: theme.colors.inkFaint,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      lineHeight: 16,
    },
    // `AttachmentRail .item` / `.thumbnail`: 64 square on r20.
    preview: { height: 64, position: 'relative', width: 64 },
    previewImage: {
      backgroundColor: theme.colors.interactiveHover,
      borderColor: theme.colors.borderL2,
      borderRadius: theme.radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      height: 64,
      width: 64,
    },
    // `AttachmentRail .remove`: an 18pt circle inset 4 from the corner, with no
    // ring of its own; the contrast fill carries it over any photo.
    removePreview: {
      alignItems: 'center',
      backgroundColor: theme.colors.controlOnMedia,
      borderRadius: theme.radius.pill,
      height: 18,
      justifyContent: 'center',
      position: 'absolute',
      right: 4,
      top: 4,
      width: 18,
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
    // `InputBar .input`: `4px 8px 0 14px` — the right pad is 8, and the draft's
    // scrollport owns the extra 4px of trailing room on the Web.
    input: {
      color: theme.colors.ink,
      fontSize: 16,
      lineHeight: 24,
      minHeight: 36,
      paddingBottom: 0,
      paddingLeft: 14,
      paddingRight: 8,
      paddingTop: 4,
    },
    // Desktop compact row: gap 12, `2px 8px 6px`; touch insets extend beyond 28pt controls.
    controlRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'nowrap',
      justifyContent: 'space-between',
      minWidth: 0,
      paddingBottom: 6,
      paddingHorizontal: 8,
      paddingTop: 2,
    },
    // Desktop 28pt circle; hitSlop={8} provides a 44pt native touch target.
    add: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      height: 28,
      flexShrink: 0,
      justifyContent: 'center',
      width: 28,
    },
    iconDisabled: { opacity: 0.5 },
    // `wqMmtW_tools` / `wqMmtW_modes`: 8px apart inside the left cluster.
    tools: { alignItems: 'center', flexDirection: 'row', flexShrink: 0, gap: 8, minWidth: 0 },
    // `wqMmtW_trailing`: model + send, 8px apart, pinned to the right edge.
    // The trailing cluster gives way before the icon triggers do: the model name
    // ellipsizes (effort first, `ModelSelect .triggerEffort`), while the access
    // and mode controls keep their native touch bounds.
    trailing: { alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row', flex: 1, gap: 8, minWidth: 0 },
    // Desktop 28pt selectors, with vertical hitSlop={8} for a 44pt touch target; `0 4px 0 8px`,
    // r8, 4px between the glyph, labels and chevron.
    tool: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: theme.radius.control,
      flexDirection: 'row',
      flexShrink: 1,
      gap: 4,
      minHeight: 28,
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
      minHeight: 28,
      opacity: 0.5,
      paddingLeft: 8,
      paddingRight: 4,
    },
    // Both triggers print 13/500 in label-secondary; only the model name steps
    // down to 400 and its effort value takes the caption tone.
    toolLabel: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    modelControl: {
      flexShrink: 1,
      maxWidth: 360,
    },
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
