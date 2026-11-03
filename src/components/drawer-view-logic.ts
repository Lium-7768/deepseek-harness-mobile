import { sessionDisplayTitle, sessionVisible, sortSessions, workspaceLabel } from '@/components/session-drawer-logic'
import type { MobileSessionSearchItem, MobileWorkspace, SessionSummary } from '@/types/mobile'

export type DrawerGrouping = 'workspace' | 'workspace-tree' | 'flat'
export type ArchivedFilter = 'default' | 'show' | 'only'
export type DrawerSearchResult = { session: SessionSummary; workspace: string; snippet?: string; archived: boolean }

/** Mirrors the desktop query boundary without splitting a UTF-16 surrogate pair. */
export function sanitizeDrawerSearch(value: string): string {
  const clean = value.replaceAll('\0', '')
  let end = 500
  if (clean.length > end && /[\uD800-\uDBFF]/.test(clean[end - 1]) && /[\uDC00-\uDFFF]/.test(clean[end])) end--
  return clean.slice(0, end)
}

export function filterArchivedSessions(
  items: readonly SessionSummary[],
  archived: ReadonlySet<string>,
  filter: ArchivedFilter,
): SessionSummary[] {
  return items.filter((item) => filter === 'show' || archived.has(item.sessionId) === (filter === 'only'))
}

/** Local metadata appears immediately; only results for the current remote query may be merged. */
export function drawerSearchResults(
  items: readonly SessionSummary[],
  workspaces: readonly MobileWorkspace[],
  query: string,
  archived: ReadonlySet<string>,
  filter: ArchivedFilter,
  content: readonly MobileSessionSearchItem[],
  limit = 100,
): { items: DrawerSearchResult[]; hasMore: boolean } {
  const q = query.trim().toLowerCase()
  if (q === '') return { items: [], hasMore: false }
  const eligible = filterArchivedSessions(items, archived, filter).filter(
    (item) => item.blank !== true && sessionVisible(item, undefined),
  )
  const byId = new Map(eligible.map((item) => [item.sessionId, item]))
  const workspaceById = new Map<string, string>()
  for (const workspace of workspaces)
    for (const id of workspace.sessionIds) {
      if (!workspaceById.has(id)) workspaceById.set(id, workspaceLabel(workspace))
    }
  const workspaceOf = (item: SessionSummary): string => workspaceById.get(item.sessionId) ?? ''
  const local = sortSessions(
    eligible.filter((item) =>
      [sessionDisplayTitle(item), workspaceOf(item), item.sessionId].some((value) => value.toLowerCase().includes(q)),
    ),
    'updated',
  )
  const ordered = new Map(local.map((item) => [item.sessionId, item]))
  const snippets = new Map<string, string>()
  for (const hit of content) {
    const item = byId.get(hit.sessionId)
    if (item !== undefined && !ordered.has(hit.sessionId)) ordered.set(hit.sessionId, item)
    if (!snippets.has(hit.sessionId)) snippets.set(hit.sessionId, hit.snippet)
  }
  return {
    items: [...ordered.values()].slice(0, limit).map((session) => ({
      session,
      workspace: workspaceOf(session),
      archived: archived.has(session.sessionId),
      ...(snippets.has(session.sessionId) ? { snippet: snippets.get(session.sessionId) } : {}),
    })),
    hasMore: ordered.size > limit,
  }
}

/** Match registered parent workspaces on path boundaries; siblings retain desktop order. */
export function workspaceHierarchy(
  workspaces: readonly MobileWorkspace[],
): { workspace: MobileWorkspace; depth: number; ancestors: string[] }[] {
  const pathOf = (workspace: MobileWorkspace): string | undefined => {
    const path = workspace.path
    if (!path) return undefined
    const windows = /^[a-z]:[/\\]/i.test(path) || path.startsWith('\\\\')
    return (windows ? path.replaceAll('\\', '/').toLowerCase() : path).replace(/\/+$/, '') || '/'
  }
  const parents = new Map<string, string>()
  for (const workspace of workspaces) {
    const child = pathOf(workspace)
    if (child === undefined) continue
    let longest = -1
    for (const candidate of workspaces) {
      const parent = pathOf(candidate)
      if (
        candidate.workspaceId !== workspace.workspaceId &&
        parent !== undefined &&
        child !== parent &&
        child.startsWith(parent === '/' ? '/' : `${parent}/`) &&
        parent.length > longest
      ) {
        parents.set(workspace.workspaceId, candidate.workspaceId)
        longest = parent.length
      }
    }
  }
  const rows: ReturnType<typeof workspaceHierarchy> = []
  function visit(parent: string | undefined, ancestors: string[]): void {
    for (const workspace of workspaces)
      if (parents.get(workspace.workspaceId) === parent) {
        rows.push({ workspace, depth: ancestors.length, ancestors })
        visit(workspace.workspaceId, [...ancestors, workspace.workspaceId])
      }
  }
  visit(undefined, [])
  return rows
}

/** Keep saved order stable across refreshes while admitting new sessions and dropping deleted ids. */
export function reconcileDrawerOrder(saved: readonly string[], members: readonly string[]): string[] {
  const allowed = new Set(members)
  return [...new Set([...saved.filter((id) => allowed.has(id)), ...members])]
}

/** Keep the floating menu in the same drawer-local coordinates as its measured trigger. */
export function drawerMenuGeometry(frameHeight: number, anchorBottom: number): { top: number; maxHeight: number } {
  const top = Math.min(Math.max(8, anchorBottom + 4), Math.max(8, frameHeight - 180))
  return { top, maxHeight: Math.max(0, frameHeight - top - 12) }
}
