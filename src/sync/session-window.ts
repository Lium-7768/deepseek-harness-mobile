import type { SessionEventItem } from '@/types/mobile'

export const LIVE_WINDOW_LIMIT = 2_000

/**
 * Settled assistant messages replace their transient deltas. Keep complete turns at
 * the tail; the desktop history API remains the source for explicitly paged older turns.
 */
export function sessionWindow(items: readonly SessionEventItem[]): { items: SessionEventItem[]; truncated: boolean } {
  const settled = new Set<string>()
  for (const item of items) {
    if (item.event.type === 'assistant/message') {
      const key = stepKey(item.event)
      if (key) settled.add(key)
    }
  }
  const compacted = items.filter(
    (item) => item.event.type !== 'assistant/chunk' || !settled.has(stepKey(item.event) ?? ''),
  )
  if (compacted.length <= LIVE_WINDOW_LIMIT) return { items: compacted, truncated: false }
  // Never cut an open turn in half: it may contain deltas whose prefix is required.
  const target = compacted.length - LIVE_WINDOW_LIMIT
  const cut = compacted.findIndex((item, index) => index >= target && item.event.type === 'turn/start')
  return cut > 0 ? { items: compacted.slice(cut), truncated: true } : { items: compacted, truncated: false }
}

function stepKey(event: Record<string, unknown>): string | undefined {
  const data =
    event.data !== null && typeof event.data === 'object' && !Array.isArray(event.data)
      ? (event.data as Record<string, unknown>)
      : event
  return typeof data.turn === 'number' && typeof data.step === 'number' ? `${data.turn}:${data.step}` : undefined
}
