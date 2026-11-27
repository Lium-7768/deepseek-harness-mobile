import { describe, expect, it } from 'vitest'
import { presentationPolicyFor, readChatPresentationPolicy } from '@/components/chat-presentation-policy'
import type { MobileSettingsPayload } from '@/types/mobile'

describe('chat presentation policy', () => {
  it('matches desktop presentation policies for all four modes', () => {
    expect(presentationPolicyFor('compact')).toMatchObject({
      foldCompletedTurns: true,
      stepGrouping: 'collapsed',
      liveProcessDetail: false,
      settledReasoningPreview: false,
    })
    expect(presentationPolicyFor('standard')).toMatchObject({
      foldCompletedTurns: true,
      stepGrouping: 'collapsed',
      liveProcessDetail: true,
      settledReasoningPreview: true,
    })
    expect(presentationPolicyFor('detailed')).toMatchObject({
      foldCompletedTurns: true,
      stepGrouping: 'history',
      liveProcessDetail: true,
      settledReasoningPreview: true,
    })
    expect(presentationPolicyFor('verbose')).toMatchObject({
      foldCompletedTurns: false,
      stepGrouping: 'none',
      liveProcessDetail: false,
      settledReasoningPreview: true,
    })
  })

  it('reads ui-chat settings from MobileSettingsPayload and falls back to desktop defaults', () => {
    expect(readChatPresentationPolicy(undefined)).toEqual(presentationPolicyFor())
    const payload = {
      namespaces: [
        {
          ns: 'ui-chat',
          value: {
            transcriptView: 'standard',
            collapseTiming: 'next-input',
            foldedReplies: 'final',
            performanceUsage: 'compact',
          },
        },
      ],
    } as unknown as MobileSettingsPayload
    expect(readChatPresentationPolicy(payload)).toEqual(
      presentationPolicyFor('standard', 'next-input', 'final', 'compact'),
    )
    const legacyNormal = {
      namespaces: [{ ns: 'ui-chat', value: { transcriptView: 'normal' } }],
    } as unknown as MobileSettingsPayload
    const legacyExpanded = {
      namespaces: [{ ns: 'ui-chat', value: { transcriptView: 'expanded' } }],
    } as unknown as MobileSettingsPayload
    expect(readChatPresentationPolicy(legacyNormal).mode).toBe('detailed')
    expect(readChatPresentationPolicy(legacyExpanded).mode).toBe('detailed')
  })
})
