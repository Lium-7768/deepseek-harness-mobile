import { readChatPresentationPolicy, type ChatPresentationPolicy } from '@/components/chat-presentation-policy'
import { closingAssistantSequences, conversationFlowGap, conversationRowKey } from '@/components/conversation-flow'
import {
  activeTurnStartedAt,
  projectNativeConversationRows,
  type NativeConversationRow,
} from '@/components/session-conversation-logic'
import { groupProcessRows } from '@/components/session-process-logic'
import { deferredLatestTurn, foldCompletedTurns, turnSpans, type NativeRow } from '@/components/session-turn-logic'
import type { SharedEventItem } from '@/shared/dsh-presentation'
import type { MobileSettingsPayload } from '@/types/mobile'
import { useMemo } from 'react'

/** Flow gaps are one of five measured values; a stable style object per value avoids
 * allocating a new wrapper style on every row render, preserving row memoization. */
export const CONVERSATION_GAP_STYLES: Readonly<Record<number, { paddingTop: number }>> = {
  0: { paddingTop: 0 },
  4: { paddingTop: 4 },
  12: { paddingTop: 12 },
  16: { paddingTop: 16 },
  24: { paddingTop: 24 },
}

export type TranscriptListEntry = {
  key: string
  row: NativeRow
  gap: number
  closing: boolean
}

export interface ConversationTranscript {
  policy: ChatPresentationPolicy
  messages: NativeConversationRow[]
  displayRows: NativeRow[]
  /** Chronological entries with precomputed flow gaps (for upright lists such as subagents). */
  entries: TranscriptListEntry[]
  /** Reversed entries with precomputed flow gaps (for the inverted primary conversation FlatList). */
  invertedEntries: TranscriptListEntry[]
  runningTurnStartedAt: number | undefined
  showRunningDivider: boolean
}

/**
 * Shared transcript projection pipeline used by both the primary session screen and the
 * child subagent screen: reads desktop `ui-chat` display policy, projects durable events,
 * groups steps, folds completed Turns, and precomputes stable list entries with flow gaps.
 */
export function useConversationTranscript(
  sourceItems: readonly SharedEventItem[],
  settings: MobileSettingsPayload | undefined,
): ConversationTranscript {
  const policy = useMemo(() => readChatPresentationPolicy(settings), [settings])
  const messages = useMemo(() => projectNativeConversationRows(sourceItems), [sourceItems])
  const runningTurnStartedAt = useMemo(() => activeTurnStartedAt(sourceItems), [sourceItems])
  const spans = useMemo(() => turnSpans(sourceItems), [sourceItems])
  const liveTurnStartSeq = useMemo(() => {
    if (runningTurnStartedAt === undefined) return undefined
    return spans.find((span) => span.endSeq === Number.MAX_SAFE_INTEGER)?.startSeq
  }, [runningTurnStartedAt, spans])
  const deferredTurn = useMemo(() => deferredLatestTurn(messages, spans, policy), [messages, policy, spans])
  const stepRows = useMemo(
    () =>
      groupProcessRows(messages, {
        policy,
        running: runningTurnStartedAt !== undefined,
        spans,
        ...(deferredTurn === undefined ? {} : { deferredTurn }),
        ...(liveTurnStartSeq === undefined ? {} : { liveTurnStartSeq }),
      }),
    [deferredTurn, liveTurnStartSeq, messages, policy, runningTurnStartedAt, spans],
  )
  const displayRows = useMemo(() => foldCompletedTurns(stepRows, { policy, spans }), [policy, spans, stepRows])
  const closingBlocks = useMemo(() => closingAssistantSequences(displayRows), [displayRows])
  const entries = useMemo<TranscriptListEntry[]>(
    () =>
      displayRows.map((row, index) => ({
        key: conversationRowKey(row, index),
        row,
        gap: conversationFlowGap(row, displayRows[index - 1]),
        closing: row.kind === 'assistant' && row.sourceSeq !== undefined && closingBlocks.has(row.sourceSeq),
      })),
    [closingBlocks, displayRows],
  )
  const invertedEntries = useMemo<TranscriptListEntry[]>(() => [...entries].reverse(), [entries])
  const lastDisplayRow = displayRows.at(-1)
  const showRunningDivider =
    lastDisplayRow !== undefined && lastDisplayRow.kind !== 'user' && lastDisplayRow.kind !== 'turn-trigger'
  return {
    policy,
    messages,
    displayRows,
    entries,
    invertedEntries,
    runningTurnStartedAt,
    showRunningDivider,
  }
}
