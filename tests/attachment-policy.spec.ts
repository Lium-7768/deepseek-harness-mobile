import { describe, expect, it } from 'vitest'
import {
  ATTACHMENT_DRAFT_BUDGET_BYTES,
  ATTACHMENT_MAX_EDGE,
  attachmentBytes,
  attachmentsWithinBudget,
  base64Bytes,
  formatAttachmentBytes,
  resizeTargetFor,
} from '../src/components/attachment-policy.ts'

describe('attachment policy', () => {
  it('shrinks only the long edge that exceeds the shipped limit', () => {
    expect(resizeTargetFor(4032, 3024)).toEqual({ height: 1200, width: ATTACHMENT_MAX_EDGE })
    expect(resizeTargetFor(3024, 4032)).toEqual({ height: ATTACHMENT_MAX_EDGE, width: 1200 })
    expect(resizeTargetFor(1600, 1600)).toBeUndefined()
    expect(resizeTargetFor(1200, 900)).toBeUndefined()
  })

  it('ignores a size the picker never measured', () => {
    expect(resizeTargetFor(0, 0)).toBeUndefined()
    expect(resizeTargetFor(Number.NaN, 3024)).toBeUndefined()
    expect(resizeTargetFor(-4032, 3024)).toBeUndefined()
  })

  it('counts the decoded size a base64 payload will cost', () => {
    // Four characters carry three bytes; the tail pads to a full group.
    expect(base64Bytes('AAAA')).toBe(3)
    expect(base64Bytes('AAA=')).toBe(2)
    expect(base64Bytes('AA==')).toBe(1)
    expect(base64Bytes('')).toBe(0)
    // 4 MB of base64 is 3 MB of image: the inflation the budget has to absorb.
    expect(base64Bytes('A'.repeat(4 * 1024 * 1024))).toBe(3 * 1024 * 1024)
  })

  it('keeps a draft inside the budget that leaves room under the gateway ceiling', () => {
    const perImage = 2 * 1024 * 1024
    expect(attachmentsWithinBudget([{ bytes: perImage }, { bytes: perImage }])).toBe(true)
    expect(attachmentsWithinBudget([{ bytes: perImage }, { bytes: perImage }, { bytes: perImage }])).toBe(true)
    // Two large photos and a third exceed the budget even though each one alone fits.
    expect(attachmentsWithinBudget([{ bytes: 4_000_000 }, { bytes: 4_000_000 }, { bytes: 2_000_000 }])).toBe(false)
    // The bound is inclusive: a draft exactly at the budget still sends.
    expect(attachmentsWithinBudget([{ bytes: ATTACHMENT_DRAFT_BUDGET_BYTES }])).toBe(true)
    expect(attachmentsWithinBudget([])).toBe(true)
  })

  it('adds the encoded sizes a draft already holds', () => {
    expect(attachmentBytes([{ bytes: 10 }, { bytes: 5 }])).toBe(15)
    expect(attachmentBytes([])).toBe(0)
  })

  it('prints a size the composer can show beside the thumbnails', () => {
    expect(formatAttachmentBytes(512)).toBe('512 B')
    expect(formatAttachmentBytes(2048)).toBe('2 KB')
    expect(formatAttachmentBytes(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })

  it('keeps the draft budget below the gateway body ceiling', () => {
    // Four images at the ceiling would be refused at the bridge; the draft stops earlier.
    expect(ATTACHMENT_DRAFT_BUDGET_BYTES).toBeLessThan(12 * 1024 * 1024)
  })
})
