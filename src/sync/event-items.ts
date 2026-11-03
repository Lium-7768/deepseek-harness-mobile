import type { SharedEventItem } from '@/shared/dsh-presentation'

export function mergeEventItems(...sources: ReadonlyArray<ReadonlyArray<SharedEventItem>>): SharedEventItem[] {
  const items = new Map<string, SharedEventItem>()
  for (const source of sources) {
    for (const item of source) {
      const key = typeof item.seq === 'number' ? `seq:${item.seq}` : `event:${JSON.stringify(item.event)}`
      items.set(key, item)
    }
  }
  return [...items.values()].sort((a, b) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER))
}
