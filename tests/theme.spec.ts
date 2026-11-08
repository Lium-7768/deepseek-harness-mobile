import { describe, expect, it } from 'vitest'
import { darkTheme, mobileTheme, themes } from '../src/theme'
import { aliases } from '../src/theme/tokens'

const colorKeys = Object.keys(mobileTheme.colors) as (keyof typeof mobileTheme.colors)[]

describe('theme appearances', () => {
  it('defines the same colour roles in both appearances', () => {
    expect(Object.keys(darkTheme.colors).sort()).toEqual([...colorKeys].sort())
  })

  it('resolves every role to a non-empty colour string', () => {
    for (const name of colorKeys) {
      for (const theme of [mobileTheme, darkTheme]) {
        const value = theme.colors[name]
        expect(typeof value, `${theme.appearance}.${name}`).toBe('string')
        expect(value.length, `${theme.appearance}.${name}`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps shape and metric tokens identical across appearances', () => {
    expect(darkTheme.radius).toBe(mobileTheme.radius)
    expect(darkTheme.spacing).toBe(mobileTheme.spacing)
    expect(darkTheme.typography).toBe(mobileTheme.typography)
    expect(darkTheme.chrome).toBe(mobileTheme.chrome)
    expect(darkTheme.touch).toBe(mobileTheme.touch)
    expect(darkTheme.rail).toBe(mobileTheme.rail)
  })

  it('ships one theme per appearance', () => {
    expect(Object.keys(themes).sort()).toEqual(['dark', 'light'])
    expect(themes.light.appearance).toBe('light')
    expect(themes.dark.appearance).toBe('dark')
  })

  it('separates the two appearances rather than reusing one palette', () => {
    const shared = colorKeys.filter((name) => mobileTheme.colors[name] === darkTheme.colors[name])
    // Code surfaces and the success hue are appearance-independent by design; a
    // palette where most roles collide would mean the dark appearance was never
    // derived.
    expect(shared.length).toBeLessThan(colorKeys.length / 2)
  })

  it('carries a dark page darker than its raised surface', () => {
    const parse = (value: string): number => {
      const match = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match === null) throw new Error(`expected an rgb() colour, received ${value}`)
      return Number(match[1]) + Number(match[2]) + Number(match[3])
    }
    expect(parse(darkTheme.colors.background)).toBeLessThan(parse(darkTheme.colors.surfaceMuted))
    expect(parse(mobileTheme.colors.background)).toBeGreaterThan(parse(mobileTheme.colors.surfaceMuted) - 1)
  })
})

describe('projected desktop aliases', () => {
  it('defines a light and a dark value for every projected role', () => {
    for (const [name, value] of Object.entries(aliases)) {
      expect(value.light, `${name}.light`).toMatch(/\S/)
      expect(value.dark, `${name}.dark`).toMatch(/\S/)
      expect(value.dark, `${name} dark differs from light`).not.toBe(undefined)
    }
  })

  it('keeps the brand colour neutral instead of using the blue accent', () => {
    // The desktop stylesheet maps --dsw-alias-brand-primary to the near-black
    // neutral and reserves blue for state-business-primary. A blue brand here
    // would mean the projection drifted.
    expect(mobileTheme.colors.brand).toBe('rgb(15, 17, 21)')
    expect(mobileTheme.colors.accent).toBe('rgb(65, 118, 230)')
    expect(mobileTheme.colors.brand).not.toBe(mobileTheme.colors.accent)
  })

  it('inverts the brand colour in the dark appearance', () => {
    expect(darkTheme.colors.brand).toBe('rgb(249, 250, 251)')
    expect(darkTheme.colors.onBrand).toBe('rgb(21, 21, 23)')
  })
})

/** WCAG relative luminance of one `rgb(r, g, b)` token. */
function luminance(value: string): number {
  const [r, g, b] = /rgb\((\d+), (\d+), (\d+)\)/
    .exec(value)!
    .slice(1, 4)
    .map((part) => {
      const channel = Number(part) / 255
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** WCAG contrast ratio between two opaque colours. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((left, right) => right - left)
  return (light! + 0.05) / (dark! + 0.05)
}

// Ink roles are chosen by what they carry, not by how they look: `inkMuted` prints
// readings a reader has to act on, `inkTertiary` secondary labels, and `inkFaint` is
// a placeholder tone. These floors are what keeps a 12px label legible outdoors.
describe('reading contrast', () => {
  const surfaces = ['canvas', 'surface', 'surfaceRaised'] as const

  it('keeps muted ink at body-reading contrast on every surface', () => {
    for (const theme of [mobileTheme, darkTheme]) {
      for (const surface of surfaces) {
        expect(
          contrast(theme.colors.inkMuted, theme.colors[surface]),
          `${theme.appearance}.inkMuted on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keeps tertiary ink above the large-text floor on every surface', () => {
    for (const theme of [mobileTheme, darkTheme]) {
      for (const surface of surfaces) {
        expect(
          contrast(theme.colors.inkTertiary, theme.colors[surface]),
          `${theme.appearance}.inkTertiary on ${surface}`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('keeps warning copy readable where it replaces the amber fill', () => {
    for (const theme of [mobileTheme, darkTheme]) {
      for (const surface of surfaces) {
        expect(
          contrast(theme.colors.warningText, theme.colors[surface]),
          `${theme.appearance}.warningText on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keeps the deep-diving label readable where the desktop draws it', () => {
    // `--dsw-alias-label-deep-diving`: a blue that has to carry 12px running text.
    for (const theme of [mobileTheme, darkTheme]) {
      for (const surface of surfaces) {
        expect(
          contrast(theme.colors.inkDeepDiving, theme.colors[surface]),
          `${theme.appearance}.inkDeepDiving on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keeps the dark appearance faint ink usable for a small label', () => {
    // The light appearance keeps its faint tone for placeholders only; the dark
    // list prints 12px labels in it, so it has to clear the text floor there.
    expect(contrast(darkTheme.colors.inkFaint, darkTheme.colors.surfaceRaised)).toBeGreaterThanOrEqual(4.5)
  })
})
