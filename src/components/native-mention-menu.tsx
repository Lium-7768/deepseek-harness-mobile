import { NativeMenuPanel, type NativeMenuGroup, type NativeMenuNotice } from '@/components/native-menu-panel'
import { mentionRows, mentionTrigger, type MentionRow, type MentionTrigger } from '@/components/mention-logic'
import { t as message } from '@/locale'
import type { MobileReferencePayload } from '@/types/mobile'
import { useEffect, useState } from 'react'

/** How long the draft must rest before the Host is asked for candidates. */
const LOOKUP_DEBOUNCE_MS = 140

/**
 * Renders the `@` mention menu over the composer.
 *
 * The Web opens `conversation.input.overlay` for `@` and resolves candidates
 * through two Host RPCs. The phone keeps one surface for everything the draft
 * can insert, so this reuses the shared menu panel and asks the Gateway only
 * once the token stops changing: each query is a Host filesystem listing, and
 * a keystroke-rate call would outrun the listing it replaces.
 *
 * @param props - The draft, the caret, the candidate lookup, and the pick handler.
 * @returns The menu, or `null` while no trigger is open.
 */
export function NativeMentionMenu({
  caret,
  lookup,
  onClose,
  onPick,
  text,
}: {
  /** Selection start from the input's own selection event. */
  caret: number
  /** Resolves both candidate lists for one query; the last call wins. */
  lookup: (query: string, signal: AbortSignal) => Promise<MobileReferencePayload>
  onClose: () => void
  /** Receives the chosen row and the trigger span it replaces. */
  onPick: (row: MentionRow, trigger: MentionTrigger) => void
  /** The whole draft. */
  text: string
}): React.JSX.Element | null {
  const trigger = mentionTrigger(text, caret)
  const active = trigger !== undefined
  const query = trigger?.query ?? ''
  const quoted = trigger?.quoted ?? false
  const [rows, setRows] = useState<MentionRow[]>([])
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!active) {
      setRows([])
      setFailed(false)
      setLoading(false)
      return
    }
    const abort = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      lookup(query, abort.signal)
        .then((payload) => {
          if (abort.signal.aborted) return
          setRows(mentionRows(payload, quoted))
          setFailed(false)
        })
        .catch(() => {
          if (abort.signal.aborted) return
          setRows([])
          setFailed(true)
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false)
        })
    }, LOOKUP_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      abort.abort()
    }
    // The trigger object is rebuilt on every keystroke; only its query and quote
    // state decide whether the Host is asked again.
  }, [active, lookup, query, quoted])

  if (trigger === undefined) return null
  const groups: NativeMenuGroup[] = [
    {
      options: rows
        .filter((row) => row.kind !== 'session')
        .map((row) => ({
          description: row.kind === 'directory' ? message('mention.folderDetail') : undefined,
          icon: row.kind === 'directory' ? ('folder-open-outline' as const) : ('workspace-tree-outline' as const),
          label: row.label,
          value: row.mention,
        })),
      title: message('mention.sectionFiles'),
    },
    {
      options: rows
        .filter((row) => row.kind === 'session')
        .map((row) => ({
          description: row.detail,
          icon: 'new-chat-outline' as const,
          label: row.label,
          value: row.mention,
        })),
      title: message('mention.sectionSessions'),
    },
  ].filter((group) => group.options.length > 0)
  const notice: NativeMenuNotice | undefined = failed
    ? { text: message('mention.failed'), tone: 'error' }
    : groups.length === 0
      ? { text: loading ? message('mention.loading') : message('mention.empty'), tone: 'muted' }
      : undefined
  return (
    <NativeMenuPanel
      actionMenu
      groups={groups}
      notice={notice}
      onClose={onClose}
      onSelect={(value) => {
        const row = rows.find((candidate) => candidate.mention === value)
        if (row === undefined) return
        onPick(row, trigger)
      }}
      open
      title={message('mention.title')}
    />
  )
}
