import { describe, expect, it } from 'vitest'
import {
  catalogModelLabel,
  createSelectionGate,
  permissionSelectionDecision,
  selectedCatalogModel,
} from '@/components/session-selection-logic'
import { permissionOptionsLocked } from '@/components/session-route-logic'

const permissions = {
  currentValue: 'workspace-write',
  options: ['workspace-write', 'read-only', 'danger-full-access'].map((value) => ({ value, name: value })),
}

describe('shared hero and conversation selection guards', () => {
  it('requires confirmation for full access and ignores current, absent, unknown and locked permissions', () => {
    expect(permissionSelectionDecision('danger-full-access', permissions, false)).toBe('confirm')
    expect(permissionSelectionDecision('read-only', permissions, false)).toBe('submit')
    for (const value of ['workspace-write', 'custom', 'unknown'])
      expect(permissionSelectionDecision(value, permissions, false)).toBe('ignore')
    expect(permissionSelectionDecision('danger-full-access', permissions, true)).toBe('ignore')
    expect(permissionSelectionDecision('danger-full-access', undefined, false)).toBe('ignore')
  })

  it('only allows permission changes with a known idle event status', () => {
    const idle = { eventsError: false, eventsPending: false, eventsStale: false, status: 'idle', submitting: false }
    expect(permissionOptionsLocked(idle)).toBe(false)
    for (const status of [undefined, 'running', 'waiting', 'connecting'])
      expect(permissionOptionsLocked({ ...idle, status })).toBe(true)
    for (const key of ['eventsError', 'eventsPending', 'eventsStale', 'submitting'] as const)
      expect(permissionOptionsLocked({ ...idle, [key]: true })).toBe(true)
  })

  it('serializes even same-render submissions and releases after failure', async () => {
    const gate = createSelectionGate()
    let finish!: () => void
    let count = 0
    const first = gate.run(
      () =>
        new Promise<void>((resolve) => {
          count++
          finish = resolve
        }),
    )
    expect(gate.busy).toBe(true)
    await gate.run(async () => {
      count++
    })
    expect(count).toBe(1)
    finish()
    await first
    await expect(
      gate.run(async () => {
        throw new Error('network')
      }),
    ).rejects.toThrow('network')
    expect(gate.busy).toBe(false)
    await gate.run(async () => {
      count++
    })
    expect(count).toBe(2)
  })

  it('uses provider identity for same-id models and renders the same name as the picker', () => {
    const groups = [
      {
        id: 'a',
        name: 'a',
        models: [{ id: 'route/model', name: 'A Model', reasoning: { efforts: [{ id: 'low', name: 'low' }] } }],
      },
      {
        id: 'b',
        name: 'b',
        models: [{ id: 'route/model', name: 'route/model', reasoning: { efforts: [{ id: 'high', name: 'high' }] } }],
      },
    ]
    expect(selectedCatalogModel(groups, { provider: 'b', model: 'route/model' })?.reasoning?.efforts[0].id).toBe('high')
    expect(catalogModelLabel(groups, { provider: 'a', model: 'route/model' })).toBe('A Model')
    expect(catalogModelLabel(groups, { provider: 'b', model: 'route/model' })).toBe('model')
    expect(selectedCatalogModel(groups, { provider: 'unknown', model: 'route/model' })).toBeUndefined()
  })
})
