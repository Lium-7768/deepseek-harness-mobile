/**
 * Collects a whole durable session log from the Gateway's message-aligned pages.
 *
 * The Gateway answers the first read with the newest page and each later read
 * with the page before an exclusive sequence number, so a caller that keeps
 * asking for the oldest sequence it already holds walks back to the log's
 * first event.
 */
import type { SessionHistoryItem, SessionHistoryPayload } from '@/types/mobile'

/** Reads one history page: no cursor for the newest page, a sequence number for older ones. */
export type SessionHistoryPageReader = (beforeSeq?: number) => Promise<SessionHistoryPayload>

/** A whole session log in durable order, with the cost of collecting it. */
export interface CollectedSessionHistory {
  /** Durable events, oldest first, deduplicated by sequence number. */
  items: SessionHistoryItem[]
  /** How many pages the Gateway returned. */
  pages: number
  /** True when the page budget ran out before the log's first event. */
  truncated: boolean
}

/** Default page budget for one export. */
const DEFAULT_MAX_PAGES = 40

/**
 * Walk the log backwards until it has no older page or the budget runs out.
 *
 * @param readPage - Reader for one page, addressed by exclusive sequence number.
 * @param options - Page budget; a short log costs one page.
 * @returns The whole log in durable order with its pagination cost.
 */
export async function collectSessionHistory(
  readPage: SessionHistoryPageReader,
  options: { maxPages?: number } = {},
): Promise<CollectedSessionHistory> {
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES)
  const pages: SessionHistoryItem[][] = []
  let truncated = false
  let page = await readPage()
  pages.push(page.items)
  while (page.hasMore === true) {
    const oldest = oldestSequence(pages[pages.length - 1])
    if (pages.length >= maxPages || oldest === undefined) {
      truncated = true
      break
    }
    const older = await readPage(oldest)
    if (older.items.length === 0 || newestSequence(older.items) === undefined) break
    // The exclusive cursor should already make a page start below the one that
    // asked for it; refusing to loop covers a Gateway that answers with the
    // same window twice, which would otherwise page until the budget ran out.
    if ((newestSequence(older.items) ?? Number.NEGATIVE_INFINITY) >= oldest) {
      truncated = true
      break
    }
    pages.push(older.items)
    page = older
  }
  return { items: dedupeBySequence(pages.reverse().flat()), pages: pages.length, truncated }
}

function oldestSequence(items: readonly SessionHistoryItem[]): number | undefined {
  let oldest: number | undefined
  for (const item of items) {
    if (typeof item.seq !== 'number') continue
    if (oldest === undefined || item.seq < oldest) oldest = item.seq
  }
  return oldest
}

function newestSequence(items: readonly SessionHistoryItem[]): number | undefined {
  let newest: number | undefined
  for (const item of items) {
    if (typeof item.seq !== 'number') continue
    if (newest === undefined || item.seq > newest) newest = item.seq
  }
  return newest
}

function dedupeBySequence(items: readonly SessionHistoryItem[]): SessionHistoryItem[] {
  const seen = new Set<number>()
  const kept: SessionHistoryItem[] = []
  for (const item of items) {
    if (typeof item.seq === 'number') {
      if (seen.has(item.seq)) continue
      seen.add(item.seq)
    }
    kept.push(item)
  }
  return kept
}
