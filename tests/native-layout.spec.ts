import { describe, expect, it } from 'vitest'
import { composerLayout, sheetGeometry, usesStackedFields } from '@/components/native-layout'

describe('native reading layouts', () => {
  it('stacks settings before enlarged text becomes a narrow column', () => {
    expect(usesStackedFields(320, 1)).toBe(true)
    expect(usesStackedFields(393, 1.5)).toBe(true)
    expect(usesStackedFields(430, 1)).toBe(false)
  })

  it('reserves sending space by reducing model chrome at narrow or enlarged widths', () => {
    expect(composerLayout(320, 1.5)).toMatchObject({ compact: true, iconModel: true, inputMinHeight: 44 })
    expect(composerLayout(393, 1)).toMatchObject({ compact: true, iconModel: false })
    expect(composerLayout(768, 1)).toMatchObject({ compact: false, iconModel: false })
  })
})

describe('modal keyboard geometry', () => {
  it('keeps a full-screen modal above an overlaid keyboard', () => {
    expect(sheetGeometry(800, 500, 44, 24)).toEqual({ bottom: 308, maxHeight: 436 })
  })

  it('does not count a keyboard twice after Android resizes the modal', () => {
    expect(sheetGeometry(500, 500, 44, 24)).toEqual({ bottom: 24, maxHeight: 420 })
    expect(sheetGeometry(800, undefined, 44, 34)).toEqual({ bottom: 34, maxHeight: 710 })
  })
})
