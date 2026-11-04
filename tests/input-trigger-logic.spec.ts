import { describe, expect, it } from 'vitest'
import { applyCommandPick, commandTrigger, rankCommands } from '@/components/input-trigger-logic'
import type { MobileCommandDescriptor } from '@/types/mobile'

const commands: MobileCommandDescriptor[] = [
  { description: 'Show or leave plan mode', name: 'plan' },
  { description: 'Switch the access preset', name: 'permission' },
  { description: 'Compact the context', name: 'compact' },
  { description: 'Open the preset picker', name: 'preset' },
]

describe('slash trigger detection', () => {
  it('opens on a slash that begins a token', () => {
    expect(commandTrigger('/', 1)).toEqual({ end: 1, kind: 'command', query: '', start: 0 })
    expect(commandTrigger('/pl', 3)).toEqual({ end: 3, kind: 'command', query: 'pl', start: 0 })
    expect(commandTrigger('hello /pl', 9)).toEqual({ end: 9, kind: 'command', query: 'pl', start: 6 })
  })

  it('stays shut for prose, for a finished token, and away from the caret', () => {
    expect(commandTrigger('a/b', 3)).toBeUndefined()
    expect(commandTrigger('/plan ', 6)).toBeUndefined()
    expect(commandTrigger('/plan off', 9)).toBeUndefined()
    expect(commandTrigger('/pl and more', 13)).toBeUndefined()
    expect(commandTrigger('', 0)).toBeUndefined()
    // A caret inside the token keeps the same span, so a pick still replaces it.
    expect(commandTrigger('/plan', 3)).toEqual({ end: 3, kind: 'command', query: 'pl', start: 0 })
  })

  it('does not treat an email-style @ or a mid-word slash as a command', () => {
    expect(commandTrigger('@file', 5)).toBeUndefined()
    expect(commandTrigger('see http://x', 12)).toBeUndefined()
  })
})

describe('command ranking', () => {
  it('puts prefix matches ahead of contains matches and keeps host order inside each band', () => {
    expect(rankCommands(commands, 'p').map((command) => command.name)).toEqual([
      'plan',
      'permission',
      'preset',
      'compact',
    ])
    expect(rankCommands(commands, 'per').map((command) => command.name)).toEqual(['permission'])
    expect(rankCommands(commands, 'pre').map((command) => command.name)).toEqual(['preset'])
    expect(rankCommands(commands, 'act').map((command) => command.name)).toEqual(['compact'])
  })

  it('returns the whole catalog for an empty query and nothing for a miss', () => {
    expect(rankCommands(commands, '')).toHaveLength(commands.length)
    expect(rankCommands(commands, 'zzz')).toEqual([])
  })
})

describe('picking a command', () => {
  it('replaces only the trigger span and leaves a trailing space for arguments', () => {
    expect(applyCommandPick('/pl', { end: 3, kind: 'command', query: 'pl', start: 0 }, 'plan')).toEqual({
      caret: 6,
      text: '/plan ',
    })
    expect(applyCommandPick('hello /pl world', { end: 9, kind: 'command', query: 'pl', start: 6 }, 'plan')).toEqual({
      caret: 12,
      text: 'hello /plan  world',
    })
  })
})
