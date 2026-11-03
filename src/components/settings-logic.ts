import type { NativeIconName } from '@/components/native-icon'
import { t as message } from '@/locale'

/** Mobile settings section ids and their Web settings navigation glyphs. */
export type MobileSettingsSection = 'general' | 'connection' | 'models' | 'plugins' | 'presets'

/** Sections shown in the sheet's bar, in the desktop's order. */
export const SETTINGS_TABS: ReadonlyArray<MobileSettingsSection> = [
  'general',
  'connection',
  'models',
  'plugins',
  'presets',
]

/** Maps native route ids to Web canonical settings icon semantics. */
export function settingsSectionIcon(section: MobileSettingsSection): NativeIconName {
  if (section === 'connection') return 'link-outline'
  if (section === 'models') return 'data-outline'
  if (section === 'plugins') return 'personalization-outline'
  if (section === 'presets') return 'agent-preset-outline'
  return 'settings-outline'
}

/**
 * Reads a settings section id off a route parameter.
 * @param value - Raw section search parameter.
 * @returns The matching section, or undefined for an unknown or missing value.
 */
export function parseSection(value: string | undefined): MobileSettingsSection | undefined {
  return SETTINGS_TABS.find((section) => section === value)
}

/**
 * Names a settings section for its tab and heading.
 * @param section - Section id, or undefined before a route resolves one.
 * @returns Localized section label.
 */
export function sectionTitle(section: MobileSettingsSection | undefined): string {
  if (section === 'general') return message('settings.sectionGeneral')
  if (section === 'connection') return message('settings.sectionConnection')
  if (section === 'models') return message('settings.sectionModels')
  if (section === 'plugins') return message('settings.sectionPlugins')
  return message('settings.sectionPresets')
}
