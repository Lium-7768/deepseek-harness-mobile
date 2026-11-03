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
    expect(sheetGeometry(800, 300, 44, 24, 800)).toEqual({ bottom: 308, maxHeight: 436 })
  })

  it('does not count a keyboard twice after Android resizes the modal', () => {
    expect(sheetGeometry(500, 300, 44, 24, 800)).toEqual({ bottom: 24, maxHeight: 420 })
    expect(sheetGeometry(800, 0, 44, 34, 800)).toEqual({ bottom: 34, maxHeight: 710 })
  })
})

it('uses keyboard and modal lengths without depending on a screen origin, including partial resize', () => {
  expect(sheetGeometry(650, 300, 20, 24, 800)).toEqual({ bottom: 158, maxHeight: 460 })
  expect(sheetGeometry(0, 300, 20, 24, 800).maxHeight).toBe(0)
  expect(sheetGeometry(500, 300, 20, 24, 500)).toEqual({ bottom: 308, maxHeight: 160 })
})
