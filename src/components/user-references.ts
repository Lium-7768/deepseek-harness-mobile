/**
 * Reads the Session and file references a user's own message carries.
 *
 * The desktop renders these as chips under the bubble, resolved from the input
 * machine's trigger state; on the phone the durable text is the only record, so the
 * canonical `@[label](dsh-session:…)` mention the composer inserted is parsed back
 * out of it. A message without references yields none.
 */

/** One reference a message carries, as the composer wrote it. */
export interface UserReference {
  label: string
  /** `session` for `dsh-session:` targets, `file` for a workspace path mention. */
  kind: 'file' | 'session'
}

const SESSION_MENTION = /@\[([^\]]+)\]\(dsh-session:([^)]+)\)/g
// A file mention starts at a token boundary, the same rule the composer uses, so an
// address in prose stays prose.
const FILE_MENTION = /(?:^|\s)@(?:"([^"]+)"|([^\s@]+))/gu

/**
 * Lists the references in one message, in the order they appear.
 *
 * @param text - The user's message text.
 * @returns Session references first, then plain `@path` file mentions.
 */
export function userReferences(text: string): UserReference[] {
  const references: UserReference[] = []
  for (const match of text.matchAll(SESSION_MENTION)) {
    const label = match[1]?.trim()
    if (label !== undefined && label !== '') references.push({ kind: 'session', label })
  }
  // A session mention contains an `@`, so the file scan runs on the text with those
  // mentions removed; otherwise every quoted label would also read as a path.
  const withoutSessions = text.replace(SESSION_MENTION, ' ')
  for (const match of withoutSessions.matchAll(FILE_MENTION)) {
    const path = (match[1] ?? match[2] ?? '').trim()
    // A bare `@` is not a reference; the boundary rule above already excluded
    // addresses inside a word.
    if (path === '') continue
    references.push({ kind: 'file', label: path })
  }
  return references
}
