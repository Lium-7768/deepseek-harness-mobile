/** Copy helpers the settings sections share. */

import { t as message } from '@/locale'

/**
 * Names a settings namespace for its card title.
 * @param ns - Settings namespace id.
 * @returns Localized label, or the raw id when the deployment names no label.
 */
export function pluginLabel(ns: string): string {
  const labels: Record<string, string> = {
    'llm-deepseek': message('settings.groupDeepseekModels'),
    'llm-pi-ai': message('settings.groupPiAiModels'),
    'web-search-deepseek': message('settings.groupDeepseekSearch'),
    shell: message('settings.groupTerminal'),
    'agent-loop': message('settings.groupAgentLoop'),
  }
  return labels[ns] ?? ns
}

/**
 * Reads the desktop guide's opening paragraph for a shipped preset.
 * @param preset - Preset whose guide is requested.
 * @returns The guide intro, or undefined when the deployment ships no guide text.
 */
export function presetGuideIntro(preset: { id: string }): string | undefined {
  const keys: Record<string, Parameters<typeof message>[0]> = {
    standard: 'settings.presetGuideStandard',
    ptc: 'settings.presetGuidePtc',
    minimal: 'settings.presetGuideMinimal',
    cordis: 'settings.presetGuideCordis',
  }
  const key = keys[preset.id]
  return key === undefined ? undefined : message(key)
}
