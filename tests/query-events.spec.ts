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

it('ignores a replayed event by comparing the tail, not the whole window', () => {
  const client = new QueryClient()
  const eventKey = queryKeys.sessionEvents('s')
  const base: MobileStreamEvent = {
    contractVersion: 1,
    eventId: 'e',
    type: 'session/event',
    sessionId: 's',
    payload: {},
  }
  client.setQueryData<SessionEventsPayload>(eventKey, {
    since: 3,
    status: 'running',
    items: [1, 2, 3].map((seq) => ({
      seq,
      event: { type: 'host/session-status', data: { running: true } },
    })),
  })
  applyMobileStreamEvent(client, { ...base, eventId: 'e-again', seq: 3, payload: { event: { type: 'turn/start' } } })
  expect(client.getQueryData<SessionEventsPayload>(eventKey)?.items).toHaveLength(3)
  expect(client.getQueryData<SessionEventsPayload>(eventKey)?.since).toBe(3)
  client.clear()
})

it("compacts a settled step's chunks only once, when the message lands", () => {
  const client = new QueryClient()
  const eventKey = queryKeys.sessionEvents('s')
  const chunk = (seq: number): SessionEventItem => ({
    seq,
    event: {
      type: 'assistant/chunk',
      data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'a' } },
    },
  })
  client.setQueryData<SessionEventsPayload>(eventKey, {
    since: 2,
    status: 'running',
    items: [chunk(1), chunk(2)],
  })
  // A non-settling event leaves the settled chunks in place; only the message compacts.
  applyMobileStreamEvent(client, {
    contractVersion: 1,
    eventId: 'tool',
    type: 'session/event',
    sessionId: 's',
    seq: 3,
    payload: { event: { type: 'tool/call', data: { name: 'read' } } },
  })
  expect(client.getQueryData<SessionEventsPayload>(eventKey)?.items).toHaveLength(3)
  applyMobileStreamEvent(client, {
    contractVersion: 1,
    eventId: 'message',
    type: 'session/event',
    sessionId: 's',
    seq: 4,
    payload: {
      event: {
        type: 'assistant/message',
        data: { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'a' }] } },
      },
    },
  })
  // The two chunks of the settled step are gone; the tool call and the message stay.
  const items = client.getQueryData<SessionEventsPayload>(eventKey)?.items ?? []
  expect(items.map((item) => item.seq)).toEqual([3, 4])
  expect(items.map((item) => item.event.type)).toEqual(['tool/call', 'assistant/message'])
  client.clear()
})
