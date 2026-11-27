import { describe, expect, it } from 'vitest'
import { isHiddenReasoning, latestReasoningDetail, reasoningSummary, reasoningText } from '@/components/reasoning-text'

describe('reasoning text preparation', () => {
  it('strips leading signature envelopes and hides signature-only reasoning', () => {
    expect(reasoningText('<signature>abc</signature>\n\nFirst line')).toBe('First line')
    expect(reasoningText('<signature>abc')).toBe('')
    expect(isHiddenReasoning('<signature>abc</signature>')).toBe(true)
    expect(isHiddenReasoning('<signature>abc</signature>\nBody')).toBe(false)
    expect(isHiddenReasoning('Plain reasoning')).toBe(false)
  })

  it('shows first line once settled and latest completed paragraph first line while streaming', () => {
    expect(reasoningSummary('**Inspect** the build\nSecond line', false)).toBe('Inspect the build')
    expect(reasoningSummary('Still typing without newline', true)).toBe('')
    expect(reasoningSummary('**Step 1**\ndetail\n\n**Step 2**\nin progress', true)).toBe('Step 2')
  })

  it('extracts the latest non-empty paragraph for live process detail', () => {
    expect(latestReasoningDetail('<signature>sig</signature>\nFirst\n\n**Second**  paragraph')).toBe('Second paragraph')
  })
})
