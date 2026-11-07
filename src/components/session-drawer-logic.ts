import { format, t as message } from '@/locale'
import type { MobileWorkspace, SessionSummary } from '@/types/mobile'

/** The two session ordering modes supported by the drawer model. */
export type SessionOrder = 'manual' | 'updated'

/** A row rendered by the drawer's workspace and session tree. */
export type SessionDrawerRow =
  | { kind: 'workspace'; key: string; label: string; workspace?: MobileWorkspace }
  | { kind: 'session'; key: string; session: SessionSummary }
  | { kind: 'overflow'; key: string; workspaceKey: string; hiddenCount: number; expanded: boolean }

/** Maximum initial session rows shown by one expanded workspace, matching the desktop browser. */
export const COLLAPSED_WORKSPACE_SESSION_LIMIT = 5

/** Resolves the active session from a root or nested Expo Router route. */
export function sessionIdFromRoute(route: { name: string; params?: unknown } | undefined): string | undefined {
  if (route === undefined || (route.name !== 'session/[sessionId]' && !route.name.startsWith('session/[sessionId]/')))
    return undefined
  if (route.params === null || typeof route.params !== 'object' || Array.isArray(route.params)) return undefined
  const sessionId = (route.params as Record<string, unknown>).sessionId
  return typeof sessionId === 'string' && sessionId.trim() !== '' ? sessionId : undefined
}

/**
 * Logical width the drawer aims for.
 *
 * The desktop sidebar's own content width is 280, which leaves the row's
 * trailing actions and a long session title fighting for about 200pt once the
 * row's own padding and status slot are paid. A phone reads the drawer instead
 * of the conversation behind it, so the row gets 320 and the scrim keeps a
 * sliver of the conversation visible as the way back.
 */
const DRAWER_CONTENT_WIDTH = 280

/** Fraction of the viewport the drawer may cover at most before the scrim is dropped. */
const DRAWER_MAX_VIEWPORT_FRACTION = 0.86

/**
 * Resolves the mobile drawer width.
 *
 * The drawer hugs the sidebar's content width, and `86vw` is only a ceiling for
 * very narrow phones: a viewport too narrow for the content width narrows the
 * drawer instead of letting it cover the whole screen, which would leave no
 * scrim to tap on the way back.
 *
 * @param viewportWidth - Viewport width in logical pixels.
 * @returns The drawer width, or `0` when the viewport is unusable.
 */
export function drawerWidthForViewport(viewportWidth: number): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 0
  const ceiling = Math.floor(viewportWidth * DRAWER_MAX_VIEWPORT_FRACTION)
  return Math.min(DRAWER_CONTENT_WIDTH, ceiling)
}

/** Sorts session summaries without mutating the gateway response. */
export function sortSessions(
  items: readonly SessionSummary[],
  order: SessionOrder,
  pinned?: ReadonlySet<string>,
): SessionSummary[] {
  const result = [...items]
  // The desktop leads each section with its pinned Sessions; a stable sort keeps the
  // chosen order inside both halves.
  if (pinned !== undefined && pinned.size > 0) result.sort((a, b) => leadingRank(a, pinned) - leadingRank(b, pinned))
  if (order === 'manual') return result
  if (pinned === undefined || pinned.size === 0) return result.sort((a, b) => sessionUpdatedAt(b) - sessionUpdatedAt(a))
  return result.sort(
    (a, b) => leadingRank(a, pinned) - leadingRank(b, pinned) || sessionUpdatedAt(b) - sessionUpdatedAt(a),
  )
}

/** Pinned rows lead their section. */
function leadingRank(session: SessionSummary, pinned: ReadonlySet<string>): number {
  return pinned.has(session.sessionId) ? 0 : 1
}

/** Resolves only an explicitly selected session; it never falls back to list order. */
export function selectedSessionTarget(
  items: readonly SessionSummary[],
  selectedSessionId: string | undefined,
): SessionSummary | undefined {
  if (selectedSessionId === undefined) return undefined
  return items.find((item) => item.sessionId === selectedSessionId)
}

/** Returns the numeric gateway timestamp used by recent-first sorting. */
export function sessionUpdatedAt(session: SessionSummary): number {
  return typeof session.updatedAt === 'number' && Number.isFinite(session.updatedAt) ? session.updatedAt : 0
}

/** Formats a session timestamp in the device's local time zone. */
export function formatSessionTime(updatedAt: unknown, now = Date.now()): string {
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt) || updatedAt <= 0)
    return message('session.timeUnknown')
  const date = new Date(updatedAt)
  if (!Number.isFinite(date.getTime())) return message('session.timeUnknown')
  const current = new Date(now)
  const reference = Number.isFinite(current.getTime()) ? current : new Date()
  const time = `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`
  if (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  )
    return time
  const dateLabel =
    date.getFullYear() === reference.getFullYear()
      ? format('session.dateSameYear', { month: date.getMonth() + 1, day: date.getDate() })
      : format('session.dateWithYear', { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() })
  return `${dateLabel} ${time}`
}

/** Resolves the desktop-compatible visible title for one session summary. */
export function sessionDisplayTitle(session: Pick<SessionSummary, 'blank' | 'title'> | undefined): string {
  if (session?.blank === true) return message('session.newSession')
  const title = session?.title?.trim()
  return title === undefined || title === '' ? message('session.newSession') : title
}

/**
 * Formats the compact relative distance the desktop sidebar prints beside a row
 * (`ui-primitives/src/relative-time.ts`, rendered through the `time.*` keys).
 *
 * @param updatedAt - Epoch milliseconds the session last changed.
 * @param now - Epoch milliseconds to measure against.
 * @returns A label such as `刚刚`, `5分钟`, or `1天`, or the unknown label.
 */
export function formatRelativeSessionTime(updatedAt: unknown, now = Date.now()): string {
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt) || updatedAt <= 0)
    return message('session.timeUnknown')
  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  const diff = Math.max(0, now - updatedAt)
  if (diff < minute) return message('session.timeNow')
  if (diff < hour) return format('session.timeMinutes', { n: Math.floor(diff / minute) })
  if (diff < day) return format('session.timeHours', { n: Math.floor(diff / hour) })
  if (diff < 30 * day) return format('session.timeDays', { n: Math.floor(diff / day) })
  if (diff < 365 * day) return format('session.timeMonths', { n: Math.floor(diff / (30 * day)) })
  return format('session.timeYears', { n: Math.floor(diff / (365 * day)) })
}

/**
 * Returns the drawer's trailing stamp.
 *
 * A running session keeps its relative time: the desktop prints that stamp in
 * every row and reports activity through the leading status dot instead
 * (`Rows.tsx` `SessionStatusDots`).
 */
export function sessionTimeLabel(session: Pick<SessionSummary, 'updatedAt'>, now = Date.now()): string {
  return formatRelativeSessionTime(session.updatedAt, now)
}

/** Reports whether the desktop projected at least one named workspace. */
export function hasWorkspaceData(workspaces: readonly MobileWorkspace[]): boolean {
  return workspaces.length > 0
}

/**
 * Finds the desktop-owned workspace that explicitly contains a session.
 * @param workspaces - Workspace memberships projected by the desktop session list.
 * @param sessionId - Current session identifier, if one is selected.
 * @returns The containing workspace, or undefined for a missing or ungrouped session.
 */
export function workspaceForSession(
  workspaces: readonly MobileWorkspace[],
  sessionId: string | undefined,
): MobileWorkspace | undefined {
  if (sessionId === undefined) return undefined
  return workspaces.find((workspace) => workspace.sessionIds.includes(sessionId))
}

/** Reports whether one desktop session has a top-level row in the selected browser view. */
export function sessionVisible(session: SessionSummary, currentSessionId: string | undefined): boolean {
  return session.origin !== 'subagent' && (session.blank !== true || session.sessionId === currentSessionId)
}

/** Builds desktop-consistent workspace and ungrouped rows from authoritative workspace membership. */
export function sessionRows(
  items: readonly SessionSummary[],
  workspaces: readonly MobileWorkspace[],
  groupBy: 'workspace' | 'flat',
  currentSessionId?: string,
  order: SessionOrder = 'manual',
): Exclude<SessionDrawerRow, { kind: 'overflow' }>[] {
  if (groupBy === 'flat')
    return items
      .filter((session) => sessionVisible(session, currentSessionId))
      .map((session) => ({ kind: 'session', key: `session:${session.sessionId}`, session }))

  const byId = new Map(items.map((session) => [session.sessionId, session]))
  const accounted = new Set<string>()
  const rows: Exclude<SessionDrawerRow, { kind: 'overflow' }>[] = []
  for (const workspace of workspaces) {
    const sessions: SessionSummary[] = []
    for (const sessionId of workspace.sessionIds) {
      accounted.add(sessionId)
      const session = byId.get(sessionId)
      if (session !== undefined && sessionVisible(session, currentSessionId)) sessions.push(session)
    }
    rows.push({
      kind: 'workspace',
      key: `workspace:${workspace.workspaceId}`,
      label: workspaceLabel(workspace),
      workspace,
    })
    rows.push(
      ...sessions.map((session) => ({ kind: 'session' as const, key: `session:${session.sessionId}`, session })),
    )
  }

  const ungrouped = items.filter(
    (session) => !accounted.has(session.sessionId) && sessionVisible(session, currentSessionId),
  )
  if (order === 'updated') ungrouped.sort((a, b) => sessionUpdatedAt(b) - sessionUpdatedAt(a))

  if (ungrouped.length > 0) {
    rows.push({ kind: 'workspace', key: 'workspace:ungrouped', label: message('session.ungrouped') })
    rows.push(
      ...ungrouped.map((session) => ({ kind: 'session' as const, key: `session:${session.sessionId}`, session })),
    )
  }
  return rows
}

/**
 * Keeps all workspace nodes visible while applying desktop-compatible expansion
 * and the per-workspace five-session overflow rule to their child rows.
 */
export function visibleWorkspaceRows(
  rows: readonly Exclude<SessionDrawerRow, { kind: 'overflow' }>[],
  collapsedWorkspaceKeys: ReadonlySet<string>,
  expandedWorkspaceSessionKeys: ReadonlySet<string>,
): SessionDrawerRow[] {
  const visible: SessionDrawerRow[] = []
  let workspace: Extract<SessionDrawerRow, { kind: 'workspace' }> | undefined
  let sessions: Extract<SessionDrawerRow, { kind: 'session' }>[] = []

  const flushWorkspace = (): void => {
    if (workspace === undefined) return
    visible.push(workspace)
    if (!collapsedWorkspaceKeys.has(workspace.key)) {
      const expanded = expandedWorkspaceSessionKeys.has(workspace.key)
      visible.push(...(expanded ? sessions : sessions.slice(0, COLLAPSED_WORKSPACE_SESSION_LIMIT)))
      if (sessions.length > COLLAPSED_WORKSPACE_SESSION_LIMIT) {
        visible.push({
          kind: 'overflow',
          key: `overflow:${workspace.key}`,
          workspaceKey: workspace.key,
          hiddenCount: sessions.length - COLLAPSED_WORKSPACE_SESSION_LIMIT,
          expanded,
        })
      }
    }
    sessions = []
  }

  for (const row of rows) {
    if (row.kind === 'workspace') {
      flushWorkspace()
      workspace = row
    } else if (workspace === undefined) {
      visible.push(row)
    } else {
      sessions.push(row)
    }
  }
  flushWorkspace()
  return visible
}

/** Uses the desktop title first and falls back to the final path segment for a workspace row. */
export function workspaceLabel(workspace: MobileWorkspace): string {
  if (workspace.title.trim() !== '') return workspace.title
  const path = workspace.path?.replace(/[\\/]+$/, '')
  const base = path?.split(/[\\/]/).at(-1)
  return base !== undefined && base !== '' ? base : workspace.workspaceId
}

function twoDigits(value: number): string {
  return value.toString().padStart(2, '0')
}

/**
 * Counts the sub-agents each listed session currently has running.
 *
 * The roster lives in the `subagentCatalog` projection, which names child sessions
 * without their liveness; the list itself is what reports which of those children are
 * running. A session whose catalog the client never received simply has no count.
 *
 * @param items - Session list rows, each possibly carrying its projections.
 * @returns Running sub-agent counts keyed by parent session id, omitting zeroes.
 */
export function runningSubagentCounts(items: readonly SessionSummary[]): Map<string, number> {
  const running = new Set(items.filter((item) => item.running === true).map((item) => item.sessionId))
  const counts = new Map<string, number>()
  for (const item of items) {
    const projections = item.projections
    const values =
      projections !== null && typeof projections === 'object' && !Array.isArray(projections)
        ? (projections as Record<string, unknown>).values
        : undefined
    const catalog =
      values !== null && typeof values === 'object' && !Array.isArray(values)
        ? (values as Record<string, unknown>).subagentCatalog
        : undefined
    if (!Array.isArray(catalog)) continue
    let count = 0
    for (const raw of catalog) {
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) continue
      const id = (raw as Record<string, unknown>).id
      if (typeof id === 'string' && running.has(id)) count += 1
    }
    if (count > 0) counts.set(item.sessionId, count)
  }
  return counts
}
