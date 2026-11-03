import { describe, expect, it } from 'vitest'
import { messageActionLayout } from '../src/components/session-message-logic.ts'
import { settingsSectionIcon } from '../src/components/settings-logic.ts'

describe('mobile UI parity mappings', () => {
  it('draws icon-only message actions at the Web 28px box with side-specific alignment', () => {
    expect(messageActionLayout('user')).toEqual({ alignSelf: 'flex-end', height: 28, width: 28 })
    expect(messageActionLayout('assistant')).toEqual({ alignSelf: 'flex-start', height: 28, width: 28 })
  })

  it('uses the Web canonical settings glyph semantics', () => {
    // Names are the desktop client's glyphs, so both clients draw the same icon.
    expect(settingsSectionIcon('general')).toBe('settings-outline')
    expect(settingsSectionIcon('models')).toBe('data-outline')
    expect(settingsSectionIcon('plugins')).toBe('personalization-outline')
    expect(settingsSectionIcon('presets')).toBe('agent-preset-outline')
  })
})
