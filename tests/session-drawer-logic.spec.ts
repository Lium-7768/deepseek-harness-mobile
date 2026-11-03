import { describe, expect, it } from 'vitest'
import {
  COLLAPSED_WORKSPACE_SESSION_LIMIT,
  drawerWidthForViewport,
  formatRelativeSessionTime,
  formatSessionTime,
  hasWorkspaceData,
  selectedSessionTarget,
  sessionDisplayTitle,
  sessionIdFromRoute,
  sessionRows,
  sessionTimeLabel,
  sortSessions,
  visibleWorkspaceRows,
  workspaceForSession,
} from '../src/components/session-drawer-logic.ts'
import type { SessionSummary } from '../src/types/mobile.ts'

const session = (sessionId: string, updatedAt: number, extra: Record<string, unknown> = {}): SessionSummary => ({
  sessionId,
  updatedAt,
  ...extra,
})

const rowLabel = (row: ReturnType<typeof visibleWorkspaceRows>[number]): string =>
  row.kind === 'workspace' ? row.label : row.kind === 'overflow' ? `overflow:${row.hiddenCount}` : row.session.sessionId

describe('session drawer logic', () => {
  it('keeps the mobile drawer at the visual parity width without exceeding its cap', () => {
    expect(drawerWidthForViewport(390)).toBe(280)
    expect(drawerWidthForViewport(480)).toBe(280)
    expect(drawerWidthForViewport(0)).toBe(0)
    // 92vw still caps a phone too narrow for the 280pt content width.
    expect(drawerWidthForViewport(300)).toBe(258)
  })

  it('sorts recent sessions by numeric gateway timestamps without mutating input', () => {
    const items = [session('old', 10), session('new', 20)]
    expect(sortSessions(items, 'updated').map((item) => item.sessionId)).toEqual(['new', 'old'])
    expect(items.map((item) => item.sessionId)).toEqual(['old', 'new'])
  })

  it('keeps manual order as a stable copy for callers with a real manual source', () => {
    const items = [session('first', 10), session('second', 20)]
    expect(sortSessions(items, 'manual').map((item) => item.sessionId)).toEqual(['first', 'second'])
  })

  it('formats an updated session timestamp instead of using a relative placeholder', () => {
    const now = new Date(2026, 7, 17, 15, 45).getTime()
    const updatedAt = new Date(2026, 7, 16, 9, 8).getTime()
    expect(formatSessionTime(updatedAt, now)).toBe('8月16日 09:08')
  })

  it('prints the drawer row time as the desktop relative distance', () => {
    const now = new Date(2026, 7, 17, 15, 45).getTime()
    const minute = 60_000
    const hour = 60 * minute
    const day = 24 * hour
    expect(formatRelativeSessionTime(now, now)).toBe('刚刚')
    expect(formatRelativeSessionTime(now - 5 * minute, now)).toBe('5分钟')
    expect(formatRelativeSessionTime(now - 3 * hour, now)).toBe('3小时')
    expect(formatRelativeSessionTime(now - 2 * day, now)).toBe('2天')
    expect(formatRelativeSessionTime(now - 61 * day, now)).toBe('2个月')
    expect(formatRelativeSessionTime(now - 400 * day, now)).toBe('1年')
    expect(sessionTimeLabel(session('recent', now - 7 * minute), now)).toBe('7分钟')
  })

  it('keeps the relative stamp for a running session', () => {
    // The desktop prints the stamp in every row and reports activity through the
    // leading status dot, so the label never turns into a state name.
    const at = 1_700_000_000_000
    expect(sessionTimeLabel({ updatedAt: at - 3 * 60_000 }, at)).toBe('3分钟')
  })

  it('uses an explicit label for invalid timestamps', () => {
    for (const updatedAt of [undefined, null, '', Number.NaN, Number.POSITIVE_INFINITY, 0]) {
      expect(formatSessionTime(updatedAt)).toBe('时间未知')
    }
  })

  it('uses desktop workspace membership order and retains an explicit ungrouped node', () => {
    const items = [session('a', 10), session('b', 9), session('c', 8)]
    const workspaces = [
      { workspaceId: 'w1', title: '项目一', sessionIds: ['b', 'a'] },
      { workspaceId: 'w2', title: '项目二', sessionIds: [] },
    ]
    expect(hasWorkspaceData(workspaces)).toBe(true)
    expect(
      sessionRows(items, workspaces, 'workspace').map((row) =>
        row.kind === 'workspace' ? row.label : row.session.sessionId,
      ),
    ).toEqual(['项目一', 'b', 'a', '项目二', '未分组', 'c'])
  })

  it('resolves the selected session workspace from desktop-owned membership only', () => {
    const workspaces = [
      { workspaceId: 'w1', title: '项目一', sessionIds: ['session-a'] },
      { workspaceId: 'w2', title: '项目二', sessionIds: ['session-b'] },
    ]
    expect(workspaceForSession(workspaces, 'session-b')?.title).toBe('项目二')
    expect(workspaceForSession(workspaces, 'ungrouped')).toBeUndefined()
    expect(workspaceForSession(workspaces, undefined)).toBeUndefined()
  })

  it('keeps workspace and ungrouped folders visible when a workspace is collapsed', () => {
    const rows = sessionRows(
      [session('a', 10), session('b', 9), session('c', 8)],
      [{ workspaceId: 'w1', title: '项目一', sessionIds: ['a', 'b'] }],
      'workspace',
    )
    expect(visibleWorkspaceRows(rows, new Set(['workspace:w1']), new Set()).map(rowLabel)).toEqual([
      '项目一',
      '未分组',
      'c',
    ])
    expect(visibleWorkspaceRows(rows, new Set(), new Set()).map(rowLabel)).toEqual(['项目一', 'a', 'b', '未分组', 'c'])
  })

  it('uses the desktop title and localizes only blank or empty titles as new sessions', () => {
    expect(sessionDisplayTitle({ ...session('named', 1), title: '  桌面标题  ' })).toBe('桌面标题')
    expect(sessionDisplayTitle({ ...session('blank', 1), blank: true })).toBe('新会话')
    expect(sessionDisplayTitle({ ...session('empty', 1), title: '   ' })).toBe('新会话')
  })

  it('keeps hidden desktop workspace members accounted without leaking blank or subagent rows into ungrouped', () => {
    const rows = sessionRows(
      [
        session('blank-other', 4, { blank: true }),
        session('blank-current', 3, { blank: true }),
        session('titled', 2, { title: '桌面标题' }),
        session('child', 1, { origin: 'subagent' }),
        session('loose', 5, { title: '未分组会话' }),
      ],
      [{ workspaceId: 'project', title: '项目', sessionIds: ['blank-other', 'blank-current', 'titled', 'child'] }],
      'workspace',
      'blank-current',
    )

    expect(rows.map((row) => (row.kind === 'workspace' ? row.label : row.session.sessionId))).toEqual([
      '项目',
      'blank-current',
      'titled',
      '未分组',
      'loose',
    ])
  })

  it('limits overflow per workspace without hiding a later desktop workspace', () => {
    const projectSessions = Array.from({ length: COLLAPSED_WORKSPACE_SESSION_LIMIT + 1 }, (_, index) =>
      session(`project-${index + 1}`, index),
    )
    const later = session('later', 99)
    const rows = sessionRows(
      [...projectSessions, later],
      [
        { workspaceId: 'project', title: '项目', sessionIds: projectSessions.map((item) => item.sessionId) },
        { workspaceId: 'later-workspace', title: '后续工作区', sessionIds: ['later'] },
      ],
      'workspace',
    )

    expect(visibleWorkspaceRows(rows, new Set(), new Set()).map(rowLabel)).toEqual([
      '项目',
      'project-1',
      'project-2',
      'project-3',
      'project-4',
      'project-5',
      'overflow:1',
      '后续工作区',
      'later',
    ])
    expect(visibleWorkspaceRows(rows, new Set(), new Set(['workspace:project'])).map(rowLabel)).toContain('project-6')
  })

  it('renders all sessions beneath ungrouped when the desktop has no registered workspace', () => {
    const items = [session('a', 10), session('b', 9)]
    expect(hasWorkspaceData([])).toBe(false)
    expect(
      sessionRows(items, [], 'workspace').map((row) => (row.kind === 'workspace' ? row.label : row.session.sessionId)),
    ).toEqual(['未分组', 'a', 'b'])
    expect(sessionRows(items, [], 'flat').every((row) => row.kind === 'session')).toBe(true)
  })

  it('resolves only the explicitly selected session', () => {
    const items = [session('first', 10), session('second', 20)]
    expect(selectedSessionTarget(items, undefined)).toBeUndefined()
    expect(selectedSessionTarget(items, 'second')?.sessionId).toBe('second')
    expect(selectedSessionTarget(items, 'missing')).toBeUndefined()
  })

  it('keeps the active session when the drawer is opened from a nested session route', () => {
    expect(sessionIdFromRoute({ name: 'session/[sessionId]', params: { sessionId: 'root' } })).toBe('root')
    expect(sessionIdFromRoute({ name: 'session/[sessionId]/interactions', params: { sessionId: 'nested' } })).toBe(
      'nested',
    )
    expect(sessionIdFromRoute({ name: 'settings', params: { sessionId: 'not-a-session-route' } })).toBeUndefined()
    expect(sessionIdFromRoute({ name: 'session/[sessionId]/interactions', params: {} })).toBeUndefined()
  })
})
