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
    const shared = colorKeys.filter(name => mobileTheme.colors[name] === darkTheme.colors[name])
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
