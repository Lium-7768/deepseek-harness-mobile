import { describe, expect, it } from 'vitest'
import { teamTaskProgress, teamTasks } from '@/components/team-task-logic'

const projection = (tasks: unknown[], enabled = true) => ({ agentTeam: { enabled, tasks } })

describe('team task board', () => {
  it('reads the Host projection and hides deleted tombstones', () => {
    const tasks = teamTasks(
      projection([
        { id: 'task-1', revision: 2, subject: '注入修复', status: 'completed', ownerName: 'writer', blockedBy: [] },
        { id: 'task-2', revision: 1, subject: '第二项', status: 'in_progress', blockedBy: ['task-1'] },
        { id: 'task-3', revision: 1, subject: '已删', status: 'deleted', blockedBy: [] },
      ]),
    )
    expect(tasks).toEqual([
      { id: 'task-1', status: 'completed', subject: '注入修复', ownerName: 'writer' },
      { blockedBy: ['task-1'], id: 'task-2', status: 'in_progress', subject: '第二项' },
    ])
    expect(teamTaskProgress(tasks)).toEqual({ completed: 1, total: 2 })
  })

  it('ignores a board that is absent, disabled, or malformed', () => {
    expect(teamTasks(undefined)).toEqual([])
    expect(teamTasks(projection([{ id: 'task-1', subject: 'x', status: 'pending' }], false))).toEqual([])
    expect(teamTasks({ agentTeam: { enabled: true, tasks: 'nope' } })).toEqual([])
  })
})
