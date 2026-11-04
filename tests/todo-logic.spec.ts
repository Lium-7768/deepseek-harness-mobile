import { describe, expect, it } from 'vitest'
import { todoFromProjection, todoProgressLabel, todoStatusLabel } from '@/components/todo-logic'

describe('todos projection reading', () => {
  it('validates every entry at the wire boundary and drops malformed members', () => {
    expect(todoFromProjection(undefined)).toBeUndefined()
    expect(todoFromProjection({})).toBeUndefined()
    expect(todoFromProjection({ todos: null })).toBeUndefined()
    expect(todoFromProjection({ todos: 'nope' })).toBeUndefined()
    expect(todoFromProjection({ todos: [] })).toBeUndefined()
    expect(todoFromProjection({ todos: [null, 3, 'x', [], {}] })).toBeUndefined()
    expect(todoFromProjection({ todos: [{ content: '   ', status: 'pending' }] })).toBeUndefined()
    expect(todoFromProjection({ todos: [{ status: 'pending' }] })).toBeUndefined()
    expect(todoFromProjection({ todos: [{ content: 'Ship it', status: 'shipped' }] })).toBeUndefined()
    // A valid member survives beside an invalid one.
    expect(todoFromProjection({ todos: [{ content: 'Ship it', status: 'pending' }, { content: 'x' }] })).toEqual([
      { content: 'Ship it', status: 'pending' },
    ])
  })

  it('keeps every status the desktop publishes', () => {
    const todos = [
      { content: 'a', status: 'pending' },
      { content: 'b', status: 'in_progress' },
      { content: 'c', status: 'completed' },
    ] as const
    expect(todoFromProjection({ todos: [...todos] })).toEqual(todos)
  })
})

describe('todos progress readings', () => {
  it('joins every non-zero count with the desktop separator and omits zeros', () => {
    const of = (...statuses: Array<'pending' | 'in_progress' | 'completed'>) =>
      statuses.map((status, index) => ({ content: `item ${index}`, status }))
    expect(todoProgressLabel(of('completed', 'in_progress', 'pending'))).toBe(
      '1 已完成\u2002·\u20021 进行中\u2002·\u20021 待处理',
    )
    expect(todoProgressLabel(of('completed', 'completed'))).toBe('2 已完成')
    expect(todoProgressLabel(of('pending'))).toBe('1 待处理')
    expect(todoProgressLabel([])).toBeUndefined()
  })

  it('names each status for the screen reader', () => {
    expect(todoStatusLabel('completed')).toBe('已完成')
    expect(todoStatusLabel('in_progress')).toBe('进行中')
    expect(todoStatusLabel('pending')).toBe('待处理')
  })
})
