import type { MobileImageMediaType } from '@/types/mobile'

/** A ready attachment: encoded payload, its media type, and the decoded size it costs. */
export type DraftImage = {
  /** Decoded byte size of {@link data}; the composer budgets the whole draft with it. */
  bytes: number
  data: string
  mediaType: MobileImageMediaType
  name?: string
  uri: string
}
