import { t as message } from '@/locale'
import type { MobileModelSelection, MobilePermissionSelect } from '@/types/mobile'

/** The multiline composer keeps Return available for newlines; sending is explicit. */
export const composerInputPolicy = {
  returnKeyType: 'default',
  submitBehavior: 'newline',
} as const

/** Describes which primary composer action remains available while a request settles. */
export function composerPrimaryAction(input: {
  cancelling: boolean
  disabled: boolean
  hasText: boolean
  running: boolean
  sending: boolean
}): { busy: boolean; disabled: boolean; kind: 'send' | 'stop' } {
  if (input.running && !input.disabled) return { busy: input.cancelling, disabled: input.cancelling, kind: 'stop' }
  return {
    busy: input.sending,
    disabled: input.disabled || input.cancelling || input.sending || !input.hasText,
    kind: 'send',
  }
}

/** Reads the host-owned permission projection without inventing mobile state. */
export function readPermissionSelect(value: unknown): MobilePermissionSelect | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const source = value as Record<string, unknown>
  if (typeof source.currentValue !== 'string' || !Array.isArray(source.options)) return undefined
  const options = source.options.flatMap((item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return []
    const option = item as Record<string, unknown>
    if (typeof option.value !== 'string' || typeof option.name !== 'string') return []
    return [
      {
        value: option.value,
        name: option.name,
        ...(typeof option.description === 'string' ? { description: option.description } : {}),
      },
    ]
  })
  return { currentValue: source.currentValue, options }
}

/** Maps built-in Agent preset ids to the Chinese labels used by the native composer. */
export function agentPresetLabel(value: string | undefined): string {
  if (value === undefined || value.trim() === '') return message('session.modeStandard')
  const labels: Record<string, string> = {
    standard: message('session.modeStandard'),
    default: message('session.modeStandard'),
    ptc: message('session.modePtc'),
    minimal: message('session.modeMinimal'),
    creative: message('session.modeCreative'),
  }
  return labels[value] ?? value
}

/** Resolves a permission label from the host option, retaining unknown host names. */
export function permissionLabel(value: string, source: MobilePermissionSelect | string): string {
  const option = typeof source === 'string' ? undefined : source.options.find(item => item.value === value)
  if (value === 'danger-full-access') return message('session.permissionFullBadge')
  if (value === 'read-only') return message('session.permissionReadOnlyBadge')
  if (value === 'workspace-write') return message('session.permissionWorkspaceBadge')
  return option?.name ?? (typeof source === 'string' ? source : value)
}

/** Supplies a localized fallback description for built-in permission presets. */
export function permissionDescription(value: string): string {
  if (value === 'read-only') return message('session.permissionReadOnlySentence')
  if (value === 'workspace-write') return message('session.permissionWorkspaceSentence')
  if (value === 'danger-full-access') return message('session.permissionFullSentence')
  return message('session.permissionDesktopPreset')
}

/** Formats the host-selected model and optional provider reasoning effort. */
export function modelLabel(model: MobileModelSelection | undefined): string {
  if (model === undefined) return message('session.selectModel')
  return model.reasoningEffort === undefined ? model.model : `${model.model} · ${model.reasoningEffort}`
}
