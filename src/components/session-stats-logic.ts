import { format } from '@/locale'
import type { SharedEventItem } from '@/shared/dsh-presentation'

/** One statistics pill: the Web's glyph plus its `·`-joined readings. */
export interface SessionStatisticsPill {
  /** Desktop glyph name, the same drawing the Web pill shows. */
  glyph: 'database-outline' | 'gauge-outline'
  /** Which click-open panel this pill owns. */
  kind: 'time' | 'usage'
  label: string
}

/** One `dt`/`dd` row inside a statistics panel. */
export interface SessionStatisticRow {
  label: string
  value: string
}

/** A click-open panel: the Web's `.panel` heading plus its detail rows. */
export interface SessionStatisticPanel {
  title: string
  /** The figure the rows add up to, printed opposite the heading. */
  headline: string
  rows: SessionStatisticRow[]
}

type SessionStatsProjection = {
  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  decodeMs: number
  decodeTokens: number
}

type TokenUsageProjection = {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** Formats token counts with the same compact units used by the desktop statistics ribbon. */
export function formatStatisticsTokens(value: number): string {
  const scaled = (amount: number): string =>
    amount >= 100 ? String(Math.round(amount)) : String(Math.round(amount * 10) / 10)
  if (value < 1_000) return String(value)
  if (value < 1_000_000) return `${scaled(value / 1_000)}K`
  return `${scaled(value / 1_000_000)}M`
}

/** Formats an elapsed duration using desktop-compatible seconds and minutes. */
export function formatStatisticsDuration(milliseconds: number): string {
  const seconds = milliseconds / 1_000
  if (seconds < 60) return `${Math.round(seconds * 10) / 10}s`
  const whole = Math.round(seconds)
  return `${Math.floor(whole / 60)}m${whole % 60}s`
}

/**
 * Formats decode throughput with the desktop conversation rule: whole tokens
 * from ten per second, one decimal below, and never a raw floating-point tail.
 */
export function formatStatisticsTokensPerSecond(tokensPerSecond: number): string {
  const clamped = Math.max(0, tokensPerSecond)
  return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10)
}

/**
 * Display-ready cache-hit share without rounding a partial hit up to 100%.
 *
 * `StatsPills.cacheHitPercent` keeps a 99.x hit honest: an ordinary integer
 * round that reaches 100 falls back to the shortest decimal precision that
 * still reads below it.
 *
 * @param cacheReadTokens - prompt tokens served from cache.
 * @param promptTokens - every prompt-side token.
 * @returns percentage text, or `undefined` when there was no prompt input.
 */
export function formatStatisticsCacheHit(cacheReadTokens: number, promptTokens: number): string | undefined {
  if (promptTokens <= 0) return undefined
  const missed = promptTokens - cacheReadTokens
  if (missed <= 0) return '100'
  const rounded = Math.round((cacheReadTokens / promptTokens) * 100)
  if (rounded < 100) return String(rounded)
  // Below 100 by less than half a percent: spend decimals until the reading
  // separates from a full hit.
  let places = 1
  while (places < 4) {
    const scale = 10 ** places
    const units = Math.floor((cacheReadTokens / promptTokens) * 100 * scale)
    if (units < 100 * scale) return (units / scale).toFixed(places)
    places += 1
  }
  return '99.9'
}

/**
 * Builds the desktop statistics ribbon as its separate pills.
 *
 * `StatsPills.module.css` prints each group as its own chip on a `1px 8px`
 * padding with an 8px radius; the pills sit 12px apart. The Web shows two: the
 * turn/step counts with the decode throughput, and the billed token total with
 * the cache-hit share. Durations and the first-token reading live in the pill's
 * click-open dialog, so they stay out of this line.
 *
 * @param projectionValues - Durable session projections, when the host sent them.
 * @param items - Visible events, used when the projections are absent.
 * @returns One pill per statistic group, or an empty list when nothing is known.
 */
export function sessionStatisticsPills(
  projectionValues: Record<string, unknown> | undefined,
  items: readonly SharedEventItem[],
): SessionStatisticsPill[] {
  const stats = readSessionStats(projectionValues?.sessionStats) ?? fallbackSessionStats(items)
  const usage = readTokenUsage(projectionValues?.tokenUsage)
  const groups: SessionStatisticsPill[] = []
  if (stats.steps > 0) {
    // The chip states the counts only: the decode speed already sits in its own
    // panel, and a second reading pushed the chip into the context meter's room.
    groups.push({
      glyph: 'gauge-outline',
      kind: 'time',
      label: format('session.statsCounts', { turns: stats.turns, steps: stats.steps }),
    })
  }
  if (usage !== undefined) {
    const input = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
    const total = input + usage.outputTokens
    if (total > 0) {
      groups.push({
        glyph: 'database-outline',
        kind: 'usage',
        label: format('session.statsTokens', { count: formatStatisticsTokens(total) }),
      })
    }
  }
  return groups
}

/**
 * Builds the rows of one statistics pill's click-open panel.
 *
 * `StatsPills` shows the wall-time and first-token readings only inside these
 * panels: the time panel lists whichever of model, tool, TTFT and speed the log
 * recorded, and the usage panel lists the exact billing buckets.
 *
 * @param kind - The pill that owns the panel.
 * @param projectionValues - Durable session projections, when the host sent them.
 * @param items - Visible events, used when the projections are absent.
 * @returns The panel heading and rows, or `undefined` when the pill has no detail.
 */
export function sessionStatisticPanel(
  kind: 'time' | 'usage',
  projectionValues: Record<string, unknown> | undefined,
  items: readonly SharedEventItem[],
): SessionStatisticPanel | undefined {
  if (kind === 'time') {
    const stats = readSessionStats(projectionValues?.sessionStats) ?? fallbackSessionStats(items)
    if (stats.steps === 0) return undefined
    const rows: SessionStatisticRow[] = []
    if (stats.llmMs > 0)
      rows.push({ label: format('session.statsModelTime', {}), value: formatStatisticsDuration(stats.llmMs) })
    if (stats.toolMs > 0)
      rows.push({ label: format('session.statsToolCallTime', {}), value: formatStatisticsDuration(stats.toolMs) })
    if (stats.ttftSteps > 0)
      rows.push({
        label: format('session.statsFirstTokenLabel', {}),
        value: formatStatisticsDuration(stats.ttftMs / stats.ttftSteps),
      })
    if (stats.decodeMs > 0) {
      rows.push({
        label: format('session.statsSpeedLabel', {}),
        value: `${formatStatisticsTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1_000))} tok/s`,
      })
    }
    if (rows.length === 0) return undefined
    // The panel's headline is what its rows total: the chip's counts describe a
    // different question than the durations below them.
    return {
      headline: formatStatisticsDuration(stats.llmMs + stats.toolMs),
      rows,
      title: format('session.statsDialogTitle', {}),
    }
  }
  const usage = readTokenUsage(projectionValues?.tokenUsage)
  if (usage === undefined) return undefined
  const input = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
  const rows: SessionStatisticRow[] = []
  const cacheHit = formatStatisticsCacheHit(usage.cacheReadTokens, input)
  if (cacheHit !== undefined) rows.push({ label: format('session.statsCacheHitLabel', {}), value: `${cacheHit}%` })
  rows.push({
    label: format('session.statsInputLabel', {}),
    value: format('session.statsTokens', { count: formatExactStatisticsTokens(usage.uncachedInputTokens) }),
  })
  rows.push({
    label: format('session.statsCacheReadLabel', {}),
    value: format('session.statsTokens', { count: formatExactStatisticsTokens(usage.cacheReadTokens) }),
  })
  if (usage.cacheWriteTokens !== 0) {
    rows.push({
      label: format('session.statsCacheWriteLabel', {}),
      value: format('session.statsTokens', { count: formatExactStatisticsTokens(usage.cacheWriteTokens) }),
    })
  }
  rows.push({
    label: format('session.statsOutputLabel', {}),
    value: format('session.statsTokens', { count: formatExactStatisticsTokens(usage.outputTokens) }),
  })
  return {
    headline: format('session.statsTokens', { count: formatStatisticsTokens(input + usage.outputTokens) }),
    rows,
    title: format('session.statsUsageTitle', {}),
  }
}

/**
 * Exact token count with digit grouping, matching `token-format.ts formatExactTokens`.
 *
 * @param value - non-negative token count.
 * @returns digits grouped in threes.
 */
export function formatExactStatisticsTokens(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** One context-composition row: the swatch colour key, its label, and its reading. */
export interface ContextBreakdownRow {
  /** Which fixed swatch this row draws. */
  tone: 'messages' | 'system' | 'tools'
  label: string
  value: string
  /** Heuristic token count behind {@link value}, used to size the bar segment. */
  share: number
}

/** The composer dock meter's click-open panel. */
export interface ContextMeterPanel {
  /** Provider-anchored occupancy, the same figure the trigger prints. */
  percent: number
  /** `~used / window`, both compacted. */
  figures: string
  /** Heuristic composition; empty while no breakdown is reported. */
  rows: ContextBreakdownRow[]
}

/**
 * Builds the context meter's click-open panel from the two token-meter projections.
 *
 * `ContextMeter` heads the panel with the occupancy reading, then a segmented bar
 * and one legend row per composition part. The figures are heuristic estimates
 * of composition, so each one carries the Web's leading `~`.
 *
 * @param projectionValues - Durable session projections, when the host sent them.
 * @returns The panel content, or `undefined` while capacity is unknown.
 */
export function contextMeterPanel(
  projectionValues: Record<string, unknown> | undefined,
): ContextMeterPanel | undefined {
  const percent = sessionContextPercent(projectionValues)
  if (percent === undefined) return undefined
  const pressure = readRecord(projectionValues?.contextPressure)
  const used = finiteNonNegative(pressure?.projectedTokens) ?? finiteNonNegative(pressure?.pressureTokens) ?? 0
  const window = finiteNonNegative(pressure?.contextWindow) ?? 0
  const breakdown = readRecord(projectionValues?.contextBreakdown)
  const rows: ContextBreakdownRow[] = []
  if (breakdown !== undefined) {
    const system = finiteNonNegative(breakdown.systemTokens) ?? 0
    const tools = finiteNonNegative(breakdown.toolsTokens) ?? 0
    const messages = finiteNonNegative(breakdown.messageTokens) ?? 0
    if (system + tools + messages > 0) {
      rows.push({
        label: format('session.contextSystem', {}),
        share: system,
        tone: 'system',
        value: `~${formatStatisticsTokens(system)}`,
      })
      rows.push({
        label: format('session.contextTools', {}),
        share: tools,
        tone: 'tools',
        value: `~${formatStatisticsTokens(tools)}`,
      })
      rows.push({
        label: format('session.contextMessages', {}),
        share: messages,
        tone: 'messages',
        value: `~${formatStatisticsTokens(messages)}`,
      })
    }
  }
  return { figures: `~${formatStatisticsTokens(used)} / ${formatStatisticsTokens(window)}`, percent, rows }
}

/**
 * Resolves the composer dock's context-occupancy reading.
 *
 * `ContextMeter` prints the percentage of the routed context window in use and
 * stays invisible until the host reports both a pressure reading and a capacity.
 *
 * @param projectionValues - Durable session projections, when the host sent them.
 * @returns The rounded percentage, or `undefined` while either figure is absent.
 */
export function sessionContextPercent(projectionValues: Record<string, unknown> | undefined): number | undefined {
  const pressure = readRecord(projectionValues?.contextPressure)
  if (pressure === undefined) return undefined
  const used = finiteNonNegative(pressure.projectedTokens) ?? finiteNonNegative(pressure.pressureTokens)
  const window = finiteNonNegative(pressure.contextWindow)
  if (used === undefined || window === undefined || window <= 0) return undefined
  return Math.min(100, Math.round((used / window) * 100))
}

/** Joins the statistics pills into the single line a text-only surface prints. */
export function sessionStatisticsLine(
  projectionValues: Record<string, unknown> | undefined,
  items: readonly SharedEventItem[],
): string | undefined {
  const groups = sessionStatisticsPills(projectionValues, items)
  return groups.length > 0 ? groups.map((pill) => pill.label).join(' | ') : undefined
}

function fallbackSessionStats(items: readonly SharedEventItem[]): SessionStatsProjection {
  const turns = items.filter((item) => item.event.type === 'turn/end').length
  const steps = items.filter((item) => item.event.type === 'step/end').length
  return { turns, steps, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 }
}

function readSessionStats(value: unknown): SessionStatsProjection | undefined {
  const record = readRecord(value)
  if (record === undefined) return undefined
  const fields = ['turns', 'steps', 'llmMs', 'toolMs', 'ttftMs', 'ttftSteps', 'decodeMs', 'decodeTokens'] as const
  const parsed = Object.fromEntries(fields.map((field) => [field, finiteNonNegative(record[field])])) as Record<
    (typeof fields)[number],
    number | undefined
  >
  if (Object.values(parsed).some((field) => field === undefined)) return undefined
  return parsed as SessionStatsProjection
}

function readTokenUsage(value: unknown): TokenUsageProjection | undefined {
  const record = readRecord(value)
  if (record === undefined) return undefined
  const fields = ['uncachedInputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens'] as const
  const parsed = Object.fromEntries(fields.map((field) => [field, finiteNonNegative(record[field])])) as Record<
    (typeof fields)[number],
    number | undefined
  >
  if (Object.values(parsed).some((field) => field === undefined)) return undefined
  return parsed as TokenUsageProjection
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}
