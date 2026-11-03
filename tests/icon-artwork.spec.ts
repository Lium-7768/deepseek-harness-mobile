import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { ICON_ARTWORK, ICON_MEDIUM_STROKE, ICON_REGULAR_STROKE } from '@/components/icon-artwork'
import desktop from './fixtures/desktop-icon-hashes.json'

describe('desktop icon artwork parity', () => {
  it('preserves every shared glyph at regular and medium weights, including dimensions', () => {
    const hash = (text: string) => createHash('sha256').update(text).digest('hex')
    const nativeOnly = new Set(['link-off', 'arrow-up'])
    for (const [name, artwork] of Object.entries(ICON_ARTWORK)) {
      if (nativeOnly.has(name)) continue
      const expected = desktop[name as keyof typeof desktop]
      expect(expected, name).toBeDefined()
      expect(artwork.size, name).toBe(expected.size)
      expect('aspect' in artwork ? artwork.aspect : [1, 1], name).toEqual(expected.aspect)
      expect(hash(artwork.svg(ICON_REGULAR_STROKE)), `${name} regular`).toBe(expected.regular)
      expect(hash(artwork.svg(ICON_MEDIUM_STROKE)), `${name} medium`).toBe(expected.medium)
    }
    expect(Object.keys(desktop).sort()).toEqual(
      Object.keys(ICON_ARTWORK)
        .filter((name) => !nativeOnly.has(name))
        .sort(),
    )
  })
})
