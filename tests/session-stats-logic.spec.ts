import { describe, expect, it } from 'vitest'
import {
  formatStatisticsCacheHit,
  formatStatisticsDuration,
  formatStatisticsTokens,
  formatStatisticsTokensPerSecond,
  sessionContextPercent,
  sessionStatisticPanel,
  sessionStatisticsLine,
  sessionStatisticsPills,
} from '../src/components/session-stats-logic.ts'

describe('session statistics logic', () => {
  it('formats desktop-compatible compact tokens and durations', () => {
    expect(formatStatisticsTokens(147)).toBe('147')
    expect(formatStatisticsTokens(3_200_000)).toBe('3.2M')
    expect(formatStatisticsDuration(6_500)).toBe('6.5s')
    expect(formatStatisticsDuration(79_000)).toBe('1m19s')
  })

  it('rounds decode throughput with the same rule as the desktop statistics ribbon', () => {
    expect(formatStatisticsTokensPerSecond(132.0146174218317)).toBe('132')
    expect(formatStatisticsTokensPerSecond(9.94)).toBe('9.9')
  })

  it('keeps a near-full cache hit below 100%', () => {
    expect(formatStatisticsCacheHit(500, 1_000)).toBe('50')
    expect(formatStatisticsCacheHit(1_000, 1_000)).toBe('100')
    expect(formatStatisticsCacheHit(0, 0)).toBeUndefined()
    expect(formatStatisticsCacheHit(99_960, 100_000)).not.toBe('100')
  })

  it('prints the two desktop pills: counts with throughput, then tokens with cache hit', () => {
    const pills = sessionStatisticsPills(
      {
        sessionStats: {
          turns: 41,
          steps: 79,
          llmMs: 379_000,
          toolMs: 12_200,
          ttftMs: 266_500,
          ttftSteps: 41,
          decodeMs: 528_000,
          decodeTokens: 77_616,
        },
        tokenUsage: {
          uncachedInputTokens: 192_000,
          cacheReadTokens: 3_000_000,
          cacheWriteTokens: 8_000,
          outputTokens: 250_000,
        },
      },
      [],
    )
    // The chips state one reading each; the throughput and the cache hit live in
    // the panels, which is where a reader goes for them.
    expect(pills).toEqual([
      { glyph: 'gauge-outline', kind: 'time', label: '41 轮 79 步' },
      { glyph: 'database-outline', kind: 'usage', label: '3.5M tok' },
    ])
    const time = sessionStatisticPanel(
      'time',
      {
        sessionStats: {
          turns: 41,
          steps: 79,
          llmMs: 379_000,
          toolMs: 12_200,
          ttftMs: 266_500,
          ttftSteps: 41,
          decodeMs: 528_000,
          decodeTokens: 77_616,
        },
      },
      [],
    )
    expect(time?.rows.map((row) => `${row.label} ${row.value}`)).toContain('输出速度（TPS） 147 tok/s')
    const usage = sessionStatisticPanel(
      'usage',
      {
        tokenUsage: {
          uncachedInputTokens: 192_000,
          cacheReadTokens: 3_000_000,
          cacheWriteTokens: 8_000,
          outputTokens: 250_000,
        },
      },
      [],
    )
    expect(usage?.rows[0]).toEqual({ label: '缓存命中', value: '94%' })
  })

  it('renders a high-precision projection without exposing a floating-point tail', () => {
    const panel = sessionStatisticPanel(
      'time',
      {
        sessionStats: {
          turns: 17,
          steps: 136,
          llmMs: 889_000,
          toolMs: 10_461_000,
          ttftMs: 421_600,
          ttftSteps: 136,
          decodeMs: 1_000,
          decodeTokens: 132.0146174218317,
        },
      },
      [],
    )
    const speed = panel?.rows.find((row) => row.value.endsWith('tok/s'))?.value ?? ''
    expect(speed).toContain('132 tok/s')
    expect(speed).not.toContain('132.0146174218317')
  })

  it('keeps the zero-throughput statistic when desktop has a decode duration', () => {
    const pills = sessionStatisticsPills(
      {
        sessionStats: {
          turns: 1,
          steps: 1,
          llmMs: 0,
          toolMs: 0,
          ttftMs: 0,
          ttftSteps: 0,
          decodeMs: 1_000,
          decodeTokens: 0,
        },
      },
      [],
    )
    expect(pills).toEqual([{ glyph: 'gauge-outline', kind: 'time', label: '1 轮 1 步' }])
    const panel = sessionStatisticPanel(
      'time',
      {
        sessionStats: {
          turns: 1,
          steps: 1,
          llmMs: 0,
          toolMs: 0,
          ttftMs: 0,
          ttftSteps: 0,
          decodeMs: 1_000,
          decodeTokens: 0,
        },
      },
      [],
    )
    expect(panel?.rows.map((row) => row.value)).toContain('0 tok/s')
  })

  it('falls back to durable completion events but omits unavailable timing and usage', () => {
    const line = sessionStatisticsLine(undefined, [
      { event: { type: 'turn/end' } },
      { event: { type: 'step/end' } },
    ] as never)
    expect(line).toBe('1 轮 1 步')
  })

  it('does not render invented statistics when neither projections nor events exist', () => {
    expect(sessionStatisticsLine(undefined, [])).toBeUndefined()
  })

  it('reports the context-occupancy percentage only once capacity is known', () => {
    expect(sessionContextPercent({ contextPressure: { pressureTokens: 4_500, contextWindow: 100_000 } })).toBe(5)
    expect(sessionContextPercent({ contextPressure: { projectedTokens: 120_000, contextWindow: 100_000 } })).toBe(100)
    expect(sessionContextPercent({ contextPressure: { pressureTokens: 4_500 } })).toBeUndefined()
    expect(sessionContextPercent({})).toBeUndefined()
  })
})
