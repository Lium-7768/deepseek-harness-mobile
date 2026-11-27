import type { NativeConversationRow } from '@/components/session-conversation-logic'

/** One durable Turn's sequence span and outcome. */
export type TurnSpan = {
  failed: boolean
  endSeq: number
  startSeq: number
  stopped: boolean
  turn: number
  /** Wall-clock duration in milliseconds, or undefined while the Turn is open. */
  durationMs?: number
}

/** One numeric value or localized unit in an elapsed-time label, matching desktop `RunDurationPart`. */
export interface TurnDurationPart {
  readonly text: string
  readonly numeric: boolean
}

/** Tool-call categories that can run live inside a step group. */
export type RunningProcessActivity =
  | 'read'
  | 'readImage'
  | 'write'
  | 'search'
  | 'edit'
  | 'commands'
  | 'code'
  | 'webSearch'
  | 'webFetch'
  | 'subagents'
  | 'plan'
  | 'questions'
  | 'tools'

/** Settled process-group activity categories, matching desktop `ProcessActivity`. */
export type ProcessActivity = RunningProcessActivity | 'context' | 'thinking'

/** One collapsible step: its reasoning, tool, context, command, and compaction rows behind one header. */
export type NativeProcessRow = {
  activity: ProcessActivity
  /** Ranked distinct tool/context activities for this group. */
  activities: readonly ProcessActivity[]
  kind: 'process'
  /** Rows the disclosure reveals. */
  rows: readonly NativeConversationRow[]
  /**
   * When true, the group renders its members directly without a collapsible header
   * or height cap (matching desktop `detailed` running Turn and `verbose` mode).
   */
  flat?: boolean
  /** Legacy alias for unheaded continuation inside a live Turn when no policy is supplied. */
  header?: false
  running: boolean
  runningDetail?: string
  rowKey: string
  sourceSeq?: number
  /** Header text: live activity (+ optional detail) while running, ranked summary once settled. */
  title: string
}

/** A conversation row as the list renders it: a step group or a plain row. */
export type NativeDisplayRow = NativeProcessRow | NativeConversationRow

/**
 * A Turn-level row the control hides: step groups, model retries, commands,
 * ungrouped step rows, or mid-turn replies when `foldedReplies === "final"`.
 * `turn-error` and `turn-max-tokens` stay outside the fold (`groupTree: "turn"`).
 */
export type NativeTurnMemberRow = Extract<
  NativeDisplayRow,
  { kind: 'process' | 'retry' | 'command' | 'context' | 'reasoning' | 'tool' | 'compaction' | 'assistant' }
>

/** A completed Turn (or its headless chronological continuation after a kept reply) folded behind one control. */
export type NativeTurnRow = {
  /** Shared disclosure key controlled by the headed Turn row. */
  controlKey?: string
  /** True for continuation segments placed after a kept mid-turn reply; renders no header. */
  continuation?: boolean
  /** True when collapseTiming is next-input and this latest Turn stays expanded until the next input. */
  defaultOpen?: boolean
  /** All descendant disclosure keys across every segment of this Turn (populated on the headed row). */
  descendantKeys?: readonly string[]
  durationMs?: number
  /** Structured duration parts so numeric tokens render in tabular monospace, matching desktop. */
  durationParts?: readonly TurnDurationPart[]
  failed: boolean
  kind: 'turn'
  /** A failed, stopped, or interleaved-input Turn stays open and its control inert. */
  locked: boolean
  rows: readonly NativeTurnMemberRow[]
  rowKey: string
  sourceSeq?: number
  title: string
  turn?: number
}

/** Any row the conversation list renders. */
export type NativeRow = NativeDisplayRow | NativeTurnRow
