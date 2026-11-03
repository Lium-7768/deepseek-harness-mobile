import { QueryClient } from '@tanstack/react-query'
import { expect, it } from 'vitest'
import { queryKeys } from '@/api/query-keys'
import { applyMobileStreamEvent } from '@/sync/query-events'
import type { MobileStreamEvent, SessionEventsPayload } from '@/types/mobile'

it('refreshes the shared session list key after desktop workspace changes', () => {
  const client = new QueryClient()
  const key = queryKeys.sessionList('https://desktop.test', 'phone')
  client.setQueryData(key, { items: [] })
  applyMobileStreamEvent(client, { contractVersion: 1, eventId: '1', type: 'host/workspace-changed', payload: {} })
  expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  client.clear()
})

it('retains a complete response after 5,000 deltas and marks settled history stale', () => {
  const client = new QueryClient()
  const eventKey = queryKeys.sessionEvents('s')
  const historyKey = queryKeys.sessionHistory('s')
  client.setQueryData(historyKey, { items: [] })
  const base: MobileStreamEvent = {
    contractVersion: 1,
    eventId: 'end',
    type: 'session/event',
    sessionId: 's',
    payload: {},
  }
  client.setQueryData<SessionEventsPayload>(eventKey, {
    since: 5000,
    status: 'running',
    items: Array.from({ length: 5000 }, (_, index) => ({
      seq: index + 1,
      event: {
        type: 'assistant/chunk',
        data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'a' } },
      },
    })),
  })
  applyMobileStreamEvent(client, {
    ...base,
    seq: 5001,
    payload: {
      event: {
        type: 'assistant/message',
        data: {
          turn: 1,
          step: 1,
          message: { content: [{ type: 'text', text: 'a'.repeat(5000) }] },
        },
      },
    },
  })
  applyMobileStreamEvent(client, { ...base, eventId: 'turn-end', seq: 5002, payload: { event: { type: 'turn/end' } } })
  expect(client.getQueryData<SessionEventsPayload>(eventKey)).toMatchObject({ since: 5002, status: 'idle' })
  expect(client.getQueryData<SessionEventsPayload>(eventKey)?.items).toHaveLength(2)
  expect(client.getQueryState(historyKey)?.isInvalidated).toBe(true)
  client.clear()
})

it('refreshes live Goal activation along with its durable projection after Goal changes and reconnect', () => {
  const client = new QueryClient()
  const key = queryKeys.sessionGoal('s')
  client.setQueryData(key, { goal: { id: 'g', revision: 1, activation: 'armed' } })
  applyMobileStreamEvent(client, {
    contractVersion: 1,
    eventId: 'goal',
    sessionId: 's',
    type: 'session/event',
    payload: { event: { type: 'goal/change' } },
  })
  expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  client.setQueryData(key, { goal: null })
  applyMobileStreamEvent(client, { contractVersion: 1, eventId: 'reconnect', type: 'gateway/ready', payload: {} })
  expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  client.clear()
})
