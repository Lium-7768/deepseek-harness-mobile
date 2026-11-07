/**
 * The copy variants the desktop offers from a payload's context menu.
 *
 * A pointer right-clicks a JSON payload to pick a representation. The phone reaches the
 * same choices from a long press, so the parsing lives here rather than in the card.
 */

/** Parses a payload that is JSON, returning undefined for anything else. */
export function parseJsonPayload(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed === '' || !(trimmed.startsWith('{') || trimmed.startsWith('['))) return undefined
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return undefined
  }
}

/** Renders a parsed payload the way the desktop's formatted JSON copy does. */
export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

/** Renders a parsed payload the way the desktop's compact JSON copy does. */
export function compactJson(value: unknown): string {
  return JSON.stringify(value)
}
