import { describe, expect, it } from 'vitest'
import {
  drawerViewRows,
  initialDrawerOrders,
  moveDrawerSession,
  drawerMenuGeometry,
  drawerSearchResults,
  filterArchivedSessions,
  reconcileDrawerOrder,
  sanitizeDrawerSearch,
  workspaceHierarchy,
} from '@/components/drawer-view-logic'
import { sessionRows, visibleWorkspaceRows } from '@/components/session-drawer-logic'

const sessions = [
  { sessionId: 'one', title: '界面检查', updatedAt: 3 },
  { sessionId: 'two', title: '连接修复', updatedAt: 5 },
  { sessionId: 'archived', title: '界面历史', updatedAt: 4 },
  { sessionId: 'blank', title: '界面', blank: true },
  { sessionId: 'child', title: '界面', origin: 'subagent' },
]
const archived = new Set(['archived'])
const workspaces = [{ workspaceId: 'project', title: '移动端', path: '/repo', sessionIds: ['one', 'two', 'archived'] }]

describe('desktop drawer view and search behavior', () => {
  it('sanitizes NUL and wire length without splitting emoji surrogate pairs', () => {
    expect(sanitizeDrawerSearch('a\0b')).toBe('ab')
    expect(sanitizeDrawerSearch('a'.repeat(499) + '😀')).toBe('a'.repeat(499))
    expect(sanitizeDrawerSearch('a'.repeat(498) + '😀x')).toBe('a'.repeat(498) + '😀')
  })

  it('immediately finds local titles, workspace labels and ids without a server response', () => {
    expect(
      drawerSearchResults(sessions, workspaces, '界面', archived, 'default', []).items.map(
        (item) => item.session.sessionId,
      ),
    ).toEqual(['one'])
    expect(
      drawerSearchResults(sessions, workspaces, '移动端', archived, 'default', []).items.map(
        (item) => item.session.sessionId,
      ),
    ).toEqual(['two', 'one'])
    expect(drawerSearchResults(sessions, workspaces, 'TWO', archived, 'default', []).items[0]?.session.sessionId).toBe(
      'two',
    )
  })

  it('merges unique content hits after local matches and keeps snippets in a separate field', () => {
    const result = drawerSearchResults(sessions, workspaces, '界面', archived, 'default', [
      { sessionId: 'two', snippet: '历史里提到界面' },
      { sessionId: 'one', snippet: '本地命中的摘要' },
      { sessionId: 'two', snippet: '重复结果' },
      { sessionId: 'unknown', snippet: '没有会话元数据' },
    ])
    expect(result.items.map((item) => item.session.sessionId)).toEqual(['one', 'two'])
    expect(result.items[1]?.snippet).toBe('历史里提到界面')
    expect(result.items[0]?.workspace).toBe('移动端')
    expect(drawerSearchResults(sessions, workspaces, ' ', archived, 'show', []).items).toEqual([])
  })

  it('applies every archived filter consistently to local and content hits and reports result truncation', () => {
    const content = [{ sessionId: 'archived', snippet: '历史' }]
    expect(filterArchivedSessions(sessions, archived, 'only').map((item) => item.sessionId)).toEqual(['archived'])
    expect(
      drawerSearchResults(sessions, workspaces, '界面', archived, 'default', content).items.map(
        (item) => item.session.sessionId,
      ),
    ).toEqual(['one'])
    expect(drawerSearchResults(sessions, workspaces, '界面', archived, 'only', content).items[0]?.archived).toBe(true)
    const limited = drawerSearchResults(sessions, workspaces, '移动端', archived, 'show', [], 1)
    expect(limited.items).toHaveLength(1)
    expect(limited.hasMore).toBe(true)
  })

  it('nests only registered workspace ancestors using full path boundaries', () => {
    const tree = workspaceHierarchy([
      { workspaceId: 'leaf', title: '叶子', path: '/repo/app/src', sessionIds: [] },
      ...workspaces,
      { workspaceId: 'sibling', title: '相似前缀', path: '/repository', sessionIds: [] },
      { workspaceId: 'app', title: '应用', path: '/repo/app/', sessionIds: [] },
    ])
    expect(tree.map(({ workspace, depth, ancestors }) => [workspace.workspaceId, depth, ancestors])).toEqual([
      ['project', 0, []],
      ['app', 1, ['project']],
      ['leaf', 2, ['project', 'app']],
      ['sibling', 0, []],
    ])
    expect(
      workspaceHierarchy([
        { workspaceId: 'a', title: 'a', path: 'C:\\Repo', sessionIds: [] },
        { workspaceId: 'b', title: 'b', path: 'c:/repo/App', sessionIds: [] },
      ])[1]?.depth,
    ).toBe(1)
  })

  it('retains manual positions as sessions refresh and keeps flat rows visible', () => {
    expect(reconcileDrawerOrder(['b', 'removed', 'a', 'b'], ['a', 'b', 'new'])).toEqual(['b', 'a', 'new'])
    const rows = sessionRows(sessions, [], 'flat')
    expect(visibleWorkspaceRows(rows, new Set(), new Set()).map((row) => row.key)).toEqual([
      'session:one',
      'session:two',
      'session:archived',
    ])
    const loose = sessionRows(sessions.slice(0, 2), [], 'workspace', undefined, 'manual')
    expect(loose.map((row) => row.key)).toEqual(['workspace:ungrouped', 'session:one', 'session:two'])
    expect(sessionRows(sessions.slice(0, 2), [], 'workspace', undefined, 'updated').map((row) => row.key)).toEqual([
      'workspace:ungrouped',
      'session:two',
      'session:one',
    ])
  })

  it('clamps the anchored menu inside short drawer frames so its content can scroll', () => {
    expect(drawerMenuGeometry(700, 180)).toEqual({ top: 184, maxHeight: 504 })
    expect(drawerMenuGeometry(300, 270)).toEqual({ top: 120, maxHeight: 168 })
  })

  it('switches grouping and ordering, and hides descendants when their parent tree folder collapses', () => {
    const nested = [
      ...workspaces,
      { workspaceId: 'nested', title: '子项目', path: '/repo/app', sessionIds: ['nested-session'] },
    ]
    const items = [...sessions, { sessionId: 'nested-session', title: '嵌套会话', updatedAt: 10 }]
    const view = {
      groupBy: 'workspace-tree' as const,
      orderBy: 'updated' as const,
      archivedFilter: 'default' as const,
      orders: {},
    }
    const open = drawerViewRows(items, nested, archived, view, undefined, new Set(), new Set()).visibleRows
    expect(open.find((row) => row.key === 'workspace:nested')?.depth).toBe(1)
    expect(open.find((row) => row.key === 'session:nested-session')?.depth).toBe(1)
    const closed = drawerViewRows(
      items,
      nested,
      archived,
      view,
      undefined,
      new Set(['workspace:project']),
      new Set(),
    ).visibleRows
    expect(closed.map((row) => row.key)).toEqual(['workspace:project'])
    const flat = drawerViewRows(
      items,
      nested,
      archived,
      { ...view, groupBy: 'flat' },
      undefined,
      new Set(),
      new Set(),
    ).visibleRows
    expect(flat.every((row) => row.kind === 'session')).toBe(true)
    expect(flat[0]?.key).toBe('session:nested-session')
  })

  it('moves manual rows within their own account while preserving hidden archived ids and saved positions', () => {
    const orders = initialDrawerOrders(sessions, workspaces, {})
    expect(orders.project).toEqual(['two', 'archived', 'one'])
    const view = {
      groupBy: 'workspace' as const,
      orderBy: 'manual' as const,
      archivedFilter: 'default' as const,
      orders,
    }
    const moved = moveDrawerSession(sessions, workspaces, archived, view, 'one', -1)
    expect(moved.project).toEqual(['one', 'archived', 'two'])
    expect(orders.project).toEqual(['two', 'archived', 'one'])
    expect(initialDrawerOrders(sessions, workspaces, moved).project).toEqual(moved.project)
    expect(moveDrawerSession(sessions, workspaces, archived, { ...view, orders: moved }, 'one', -1)).toBe(moved)
    const rows = drawerViewRows(
      sessions,
      workspaces,
      archived,
      { ...view, orders: moved },
      undefined,
      new Set(),
      new Set(),
    ).visibleRows
    expect(rows.map((row) => row.key)).toEqual(['workspace:project', 'session:one', 'session:two'])
  })
})
