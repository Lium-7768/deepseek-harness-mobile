import { t as message } from '@/locale'
import type { MobilePermissionSelect } from '@/types/mobile'

/** The multiline composer keeps Return available for newlines; sending is explicit. */
export const composerInputPolicy = { returnKeyType: 'default', submitBehavior: 'newline' } as const

/**
 * Reports a paired client whose event stream dropped.
 *
 * The shell prints its reconnect bar from this, and the composer refuses to send from
 * it: a prompt accepted now would start a turn nobody can watch.
 *
 * @param args - Whether a paired connection exists and the reported stream status.
 * @returns True when the stream is down for a paired client.
 */
export function streamDropped({ hasConnection, status }: { hasConnection: boolean; status: string }): boolean {
  return hasConnection && status === 'disconnected'
}

/** Describes which primary composer action remains available while a request settles. */
export function composerPrimaryAction(input: {
  cancelling: boolean
  disabled: boolean
  hasText: boolean
  /** The event stream is down: a prompt sent now would run unwatched. */
  offline?: boolean
  running: boolean
  sending: boolean
}): { busy: boolean; disabled: boolean; kind: 'send' | 'stop' } {
  // The desktop stops only from an empty composer: with a draft present the primary
  // control delivers that draft instead (queued or steered), and Stop stays on the
  // keyboard shortcut. A phone has no shortcut, so an empty draft is what exposes Stop.
  if (input.running && !input.disabled && !input.hasText)
    return { busy: input.cancelling, disabled: input.cancelling, kind: 'stop' }
  return {
    busy: input.sending,
    // A stop still reaches the Host over HTTP when only the event stream dropped, so
    // `offline` gates sending alone.
    disabled: input.disabled || input.offline === true || input.cancelling || input.sending || !input.hasText,
    kind: 'send',
  }
}

/** Permission presets every DSH deployment composes; the host publishes no catalog here. */
const BUILTIN_PERMISSION_PRESETS = ['read-only', 'workspace-write', 'danger-full-access'] as const

/**
 * Reads the host-owned permission projection and supplies the selectable presets.
 *
 * The projection's wire view carries only `currentValue`, so the picker's rows
 * come from the presets the product composes rather than from invented state.
 * @param value - Projection value from the session history response.
 * @returns The current value with its selectable presets, or undefined when absent.
 */
export function readPermissionSelect(value: unknown): MobilePermissionSelect | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const source = value as Record<string, unknown>
  if (typeof source.currentValue !== 'string' || source.currentValue === '') return undefined
  const hostOptions = Array.isArray(source.options)
    ? source.options.flatMap((item) => {
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
    : []
  return {
    currentValue: source.currentValue,
    options: hostOptions.length > 0 ? hostOptions : builtinPermissionOptions(),
  }
}

function builtinPermissionOptions(): MobilePermissionSelect['options'] {
  return BUILTIN_PERMISSION_PRESETS.map((value) => ({
    value,
    name: permissionLabel(value, value),
    description: permissionDescription(value),
  }))
}

/** Maps built-in Agent preset ids to the Chinese labels used by the native composer. */
export function agentPresetLabel(value: string | undefined): string {
  if (value === undefined || value.trim() === '') return message('session.modeStandard')
  const labels: Record<string, string> = {
    standard: message('session.modeStandard'),
    default: message('session.modeStandard'),
    ptc: message('session.modePtc'),
    minimal: message('session.modeMinimal'),
    cordis: message('session.modeCreative'),
    creative: message('session.modeCreative'),
  }
  return labels[value] ?? value
}

/**
 * Resolves one roster row's display name.
 *
 * A shipped preset publishes no name, so its id carries the copy; a declaration
 * that names itself is never translated.
 * @param preset - Roster row with its id and optional published name.
 * @returns The localized shipped name, or the declaration's own name.
 */
export function agentPresetName(preset: { id: string; name?: string }): string {
  const name = preset.name?.trim()
  return name === undefined || name === '' || name === preset.id ? agentPresetLabel(preset.id) : name
}

/** Shipped Agent preset ids; the desktop ships exactly these four compositions. */
const SHIPPED_PRESET_IDS = ['standard', 'ptc', 'minimal', 'cordis'] as const

/**
 * Reports whether a roster row is one of the shipped presets.
 *
 * A shipped preset publishes no name, so its id and the missing name together
 * identify it; a declaration that names itself owns its copy.
 * @param preset - Roster row with its id and optional published name.
 * @returns True for a shipped preset id that publishes no name.
 */
export function isShippedPreset(preset: { id: string; name?: string }): boolean {
  return preset.name === undefined && (SHIPPED_PRESET_IDS as readonly string[]).includes(preset.id)
}

/**
 * Resolves one roster row's description.
 *
 * @param preset - Roster row with its id, optional name, and optional copy fields.
 * @returns The broken reason, the declaration's description, or localized copy.
 */
export function agentPresetDescription(preset: {
  id: string
  name?: string
  description?: string
  broken?: string
}): string {
  if (preset.broken !== undefined) return preset.broken
  const description = preset.description?.trim()
  if (description !== undefined && description !== '') return description
  const builtin = builtinPresetDescription(preset.id)
  if (builtin !== undefined) return builtin
  return isShippedPreset(preset) ? message('settings.builtinMode') : message('settings.customMode')
}

function builtinPresetDescription(id: string): string | undefined {
  if (id === 'standard') return message('settings.modeStandardDetail')
  if (id === 'ptc') return message('settings.modePtcDetail')
  if (id === 'minimal') return message('settings.modeMinimalDetail')
  if (id === 'cordis') return message('settings.modeCreativeDetail')
  return undefined
}

/** Resolves a permission label from the host option, retaining unknown host names. */
export function permissionLabel(value: string, source: MobilePermissionSelect | string): string {
  const option = typeof source === 'string' ? undefined : source.options.find((item) => item.value === value)
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
