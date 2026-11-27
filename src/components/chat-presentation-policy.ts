/**
 * Chat display policy mirroring desktop `packages/client/ui-chat/src/client/presentation-policy.ts`.
 *
 * Reads the Host-backed `ui-chat` settings namespace so mobile follows the same
 * work-details mode (`compact` | `standard` | `detailed` | `verbose`), collapse
 * timing (`completion` | `next-input`), and folded-reply policy (`all` | `final`).
 */

import type { MobileSettingsPayload } from '@/types/mobile'

export const TRANSCRIPT_VIEW_MODES = ['compact', 'standard', 'detailed', 'verbose'] as const
export type TranscriptViewMode = (typeof TRANSCRIPT_VIEW_MODES)[number]

export const COLLAPSE_TIMINGS = ['completion', 'next-input'] as const
export type CollapseTiming = (typeof COLLAPSE_TIMINGS)[number]

export const FOLDED_REPLIES = ['all', 'final'] as const
export type FoldedReplies = (typeof FOLDED_REPLIES)[number]

export const PERFORMANCE_USAGE_MODES = ['compact', 'detailed'] as const
export type PerformanceUsageMode = (typeof PERFORMANCE_USAGE_MODES)[number]

export const DEFAULT_TRANSCRIPT_VIEW: TranscriptViewMode = 'detailed'
export const DEFAULT_COLLAPSE_TIMING: CollapseTiming = 'completion'
export const DEFAULT_FOLDED_REPLIES: FoldedReplies = 'all'
export const DEFAULT_PERFORMANCE_USAGE: PerformanceUsageMode = 'detailed'

export interface ChatPresentationPolicy {
  readonly mode: TranscriptViewMode
  readonly collapseTiming: CollapseTiming
  readonly foldedReplies: FoldedReplies
  readonly performanceUsage: PerformanceUsageMode
  readonly foldCompletedTurns: boolean
  readonly stepGrouping: 'collapsed' | 'history' | 'none'
  readonly liveProcessDetail: boolean
  readonly settledReasoningPreview: boolean
}

const POLICIES: Readonly<
  Record<TranscriptViewMode, Omit<ChatPresentationPolicy, 'collapseTiming' | 'foldedReplies' | 'performanceUsage'>>
> = {
  compact: {
    mode: 'compact',
    foldCompletedTurns: true,
    stepGrouping: 'collapsed',
    liveProcessDetail: false,
    settledReasoningPreview: false,
  },
  standard: {
    mode: 'standard',
    foldCompletedTurns: true,
    stepGrouping: 'collapsed',
    liveProcessDetail: true,
    settledReasoningPreview: true,
  },
  detailed: {
    mode: 'detailed',
    foldCompletedTurns: true,
    stepGrouping: 'history',
    liveProcessDetail: true,
    settledReasoningPreview: true,
  },
  verbose: {
    mode: 'verbose',
    foldCompletedTurns: false,
    stepGrouping: 'none',
    liveProcessDetail: false,
    settledReasoningPreview: true,
  },
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export function presentationPolicyFor(
  mode: TranscriptViewMode = DEFAULT_TRANSCRIPT_VIEW,
  collapseTiming: CollapseTiming = DEFAULT_COLLAPSE_TIMING,
  foldedReplies: FoldedReplies = DEFAULT_FOLDED_REPLIES,
  performanceUsage: PerformanceUsageMode = DEFAULT_PERFORMANCE_USAGE,
): ChatPresentationPolicy {
  return { ...POLICIES[mode], collapseTiming, foldedReplies, performanceUsage }
}

export function readChatPresentationPolicy(settings: MobileSettingsPayload | undefined): ChatPresentationPolicy {
  const entry = settings?.namespaces.find((item) => item.ns === 'ui-chat')
  const record = readRecord(entry?.value)
  const rawMode = readString(record?.transcriptView)
  const mode: TranscriptViewMode =
    rawMode === 'compact' || rawMode === 'standard' || rawMode === 'detailed' || rawMode === 'verbose'
      ? rawMode
      : DEFAULT_TRANSCRIPT_VIEW
  const rawTiming = readString(record?.collapseTiming)
  const collapseTiming: CollapseTiming = rawTiming === 'next-input' ? 'next-input' : DEFAULT_COLLAPSE_TIMING
  const rawReplies = readString(record?.foldedReplies)
  const foldedReplies: FoldedReplies = rawReplies === 'final' ? 'final' : DEFAULT_FOLDED_REPLIES
  const rawPerformance = readString(record?.performanceUsage)
  const performanceUsage: PerformanceUsageMode = rawPerformance === 'compact' ? 'compact' : DEFAULT_PERFORMANCE_USAGE
  return presentationPolicyFor(mode, collapseTiming, foldedReplies, performanceUsage)
}
