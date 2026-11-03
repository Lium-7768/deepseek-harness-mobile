import { describe, expect, it } from 'vitest'
import { effortIndexAtPosition, reasoningEffortLabel } from '@/components/model-picker-logic'
import { modelPopoverGeometry } from '@/components/native-layout'

describe('native model control layout', () => {
  it('snaps only to catalog stops and clamps taps outside the track', () => {
    expect([0, 20, 120, 220, 320, 500].map((x) => effortIndexAtPosition(x, 340, 4))).toEqual([0, 0, 1, 2, 3, 3])
    expect(effortIndexAtPosition(0, 0, 1)).toBe(0)
  })
  it('keeps custom host effort names, with localized fallbacks for bare ids', () => {
    expect(reasoningEffortLabel('high', [{ id: 'high', name: 'Deep thinking' }])).toBe('Deep thinking')
    expect(reasoningEffortLabel('high', [{ id: 'high', name: 'high' }])).toBe('高')
    expect(reasoningEffortLabel('max', [])).toBe('max')
  })
  it('aligns above the composer without covering the trigger, and clamps horizontal edges', () => {
    const frame = modelPopoverGeometry(393, 852, 44, 34, { x: 150, y: 720, width: 180, height: 36 })
    expect(frame).toEqual({ left: 12, width: 369, bottom: 140, maxHeight: 656 })
    expect(modelPopoverGeometry(1024, 800, 20, 24, { x: 700, y: 650, width: 160, height: 36 }).left).toBe(480)
  })
  it('stays inside safe areas after keyboard resize and falls back to a sheet when the trigger has little room', () => {
    const frame = modelPopoverGeometry(320, 500, 44, 180, { x: 130, y: 640, width: 150, height: 36 })
    expect(frame.bottom).toBe(188)
    expect(frame.maxHeight).toBe(256)
    expect(modelPopoverGeometry(320, 500, 44, 24, { x: 10, y: 120, width: 100, height: 36 }).bottom).toBe(24)
    const narrow = modelPopoverGeometry(320, 500, 44, 24, undefined)
    expect(narrow.width).toBe(296)
    expect(narrow.left).toBe(12)
  })
})
