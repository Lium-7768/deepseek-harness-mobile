import {
  sessionRows,
  visibleWorkspaceRows,
  workspaceForSession,
  type SessionOrder,
  sessionDisplayTitle,
  sessionVisible,
  sortSessions,
  workspaceLabel,
} from '@/components/session-drawer-logic'
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

export type DrawerViewPreferences = {
  groupBy: DrawerGrouping
  orderBy: SessionOrder
  archivedFilter: ArchivedFilter
  orders: Record<string, string[]>
}

/** Derive row ordering and tree indentation without adding local state to desktop sessions. */
export function drawerViewRows(
  items: readonly SessionSummary[],
  workspaces: readonly MobileWorkspace[],
  archived: ReadonlySet<string>,
  view: DrawerViewPreferences,
  currentSessionId: string | undefined,
  collapsed: ReadonlySet<string>,
  expanded: ReadonlySet<string>,
  pinned?: ReadonlySet<string>,
) {
  const { groupBy, orderBy } = view
  const sessions = filterArchivedSessions(items, archived, view.archivedFilter)
  const ordered = sortSessions(sessions, orderBy, pinned)
  const rankBySaved = (account: string, members: readonly string[]): Map<string, number> =>
    new Map(reconcileDrawerOrder(view.orders[account] ?? [], members).map((id, index) => [id, index]))
  const compare =
    (rank: ReadonlyMap<string, number>) =>
    (a: SessionSummary, b: SessionSummary): number =>
      (rank.get(a.sessionId) ?? Infinity) - (rank.get(b.sessionId) ?? Infinity)
  if (orderBy === 'manual' && groupBy === 'flat')
    ordered.sort(
      compare(
        rankBySaved(
          'flat',
          items.map((item) => item.sessionId),
        ),
      ),
    )
  const hierarchy = workspaceHierarchy(workspaces)
  const workspaceRows = (groupBy === 'workspace-tree' ? hierarchy.map((item) => item.workspace) : workspaces).map(
    (workspace) => ({
      ...workspace,
      sessionIds:
        orderBy === 'updated'
          ? ordered.filter((item) => workspace.sessionIds.includes(item.sessionId)).map((item) => item.sessionId)
          : leadPinned(
              reconcileDrawerOrder(view.orders[workspace.workspaceId] ?? workspace.sessionIds, workspace.sessionIds),
              pinned,
            ),
    }),
  )
  const ungrouped = ordered.filter((item) => workspaceForSession(workspaces, item.sessionId) === undefined)
  if (orderBy === 'manual')
    ungrouped.sort(
      compare(
        rankBySaved(
          'ungrouped',
          items
            .filter((item) => workspaceForSession(workspaces, item.sessionId) === undefined)
            .map((item) => item.sessionId),
        ),
      ),
    )
  const rows = sessionRows(
    groupBy === 'flat'
      ? ordered
      : [...ungrouped, ...ordered.filter((item) => workspaceForSession(workspaces, item.sessionId) !== undefined)],
    workspaceRows,
    groupBy === 'flat' ? 'flat' : 'workspace',
    currentSessionId,
    orderBy,
  )
  const tree = new Map(hierarchy.map((item) => [`workspace:${item.workspace.workspaceId}`, item]))
  let depth = 0
  let hidden = false
  const visibleRows = visibleWorkspaceRows(rows, collapsed, expanded).flatMap((item) => {
    if (groupBy !== 'workspace-tree') return [{ ...item, depth: 0 }]
    if (item.kind === 'workspace') {
      const node = tree.get(item.key)
      depth = node?.depth ?? 0
      hidden = node?.ancestors.some((id) => collapsed.has(`workspace:${id}`)) ?? false
    }
    return hidden ? [] : [{ ...item, depth }]
  })
  return { rows, visibleRows }
}

/** Freeze initial manual accounts once, then retain them when switching sort modes. */
export function initialDrawerOrders(
  items: readonly SessionSummary[],
  workspaces: readonly MobileWorkspace[],
  saved: Record<string, string[]>,
): Record<string, string[]> {
  const orders = { ...saved }
  const recent = sortSessions(items, 'updated')
  for (const account of ['flat', 'ungrouped', ...workspaces.map((workspace) => workspace.workspaceId)]) {
    const members =
      account === 'flat'
        ? recent
        : recent.filter(
            (item) => (workspaceForSession(workspaces, item.sessionId)?.workspaceId ?? 'ungrouped') === account,
          )
    orders[account] = reconcileDrawerOrder(
      orders[account] ?? [],
      members.map((item) => item.sessionId),
    )
  }
  return orders
}

/** Native move controls preserve hidden/archived positions and never cross workspace accounts. */
export function moveDrawerSession(
  items: readonly SessionSummary[],
  workspaces: readonly MobileWorkspace[],
  archived: ReadonlySet<string>,
  view: DrawerViewPreferences,
  id: string,
  direction: -1 | 1,
): Record<string, string[]> {
  const accountFor = (sessionId: string): string =>
    view.groupBy === 'flat' ? 'flat' : (workspaceForSession(workspaces, sessionId)?.workspaceId ?? 'ungrouped')
  const account = accountFor(id)
  const members = items.filter((item) => accountFor(item.sessionId) === account).map((item) => item.sessionId)
  const order = reconcileDrawerOrder(view.orders[account] ?? [], members)
  const visible = filterArchivedSessions(items, archived, view.archivedFilter)
    .filter((item) => members.includes(item.sessionId) && item.blank !== true && sessionVisible(item, undefined))
    .sort((a, b) => order.indexOf(a.sessionId) - order.indexOf(b.sessionId))
  const neighbor = visible[visible.findIndex((item) => item.sessionId === id) + direction]?.sessionId
  const from = order.indexOf(id)
  const to = neighbor === undefined ? -1 : order.indexOf(neighbor)
  if (from < 0 || to < 0) return view.orders
  const held = order[from]
  order[from] = order[to]
  order[to] = held
  return { ...view.orders, [account]: order }
}

/** Moves pinned ids to the front without disturbing the order inside either half. */
function leadPinned(ids: readonly string[], pinned: ReadonlySet<string> | undefined): string[] {
  if (pinned === undefined || pinned.size === 0) return [...ids]
  return [...ids].sort((a, b) => (pinned.has(a) ? 0 : 1) - (pinned.has(b) ? 0 : 1))
}
