import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startMobileSync } from '@/sync/runtime'
import { consumeEventStream } from '@/sync/event-stream'

const connection = { gatewayUrl: 'https://desktop.test', deviceId: 'phone', accessToken: 'token' }
const encoder = new TextEncoder()
const ready = JSON.stringify({ contractVersion: 1, eventId: 'ready', type: 'gateway/ready', payload: {} })
let stop: (() => void) | undefined
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  stop?.()
  stop = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('native sync lifecycle', () => {
  it('waits for ready and backs off consecutive failed connections', async () => {
    const fetchStream = vi.fn().mockRejectedValue(new Error('offline'))
    const setStatus = vi.fn()
    stop = startMobileSync({
      connection,
      queryClient: new QueryClient(),
      fetchStream,
      setStatus,
      markEvent: vi.fn(),
      onUnauthorized: vi.fn(),
    })
    expect(setStatus).toHaveBeenCalledWith('connecting')
    expect(setStatus).not.toHaveBeenCalledWith('connected')
    await vi.advanceTimersByTimeAsync(0)
    for (const delay of [1000, 2000, 5000, 10000]) {
      const attempts = fetchStream.mock.calls.length
      await vi.advanceTimersByTimeAsync(delay - 1)
      expect(fetchStream).toHaveBeenCalledTimes(attempts)
      await vi.advanceTimersByTimeAsync(1)
      expect(fetchStream).toHaveBeenCalledTimes(attempts + 1)
    }
  })

  it('detects an idle stream, cancels its reader, and reconnects', async () => {
    let streamController!: ReadableStreamDefaultController<Uint8Array>
    const cancel = vi.fn()
    const fetchStream = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(c) {
            streamController = c
          },
          cancel,
        }),
      }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ contractVersion: 1, data: { sessionIds: [] } }))),
    )
    const setStatus = vi.fn()
    stop = startMobileSync({
      connection,
      queryClient: new QueryClient(),
      fetchStream,
      setStatus,
      markEvent: vi.fn(),
      onUnauthorized: vi.fn(),
    })
    await vi.advanceTimersByTimeAsync(0)
    streamController.enqueue(encoder.encode(`data: ${ready}\n\n`))
    await vi.advanceTimersByTimeAsync(0)
    expect(setStatus).toHaveBeenLastCalledWith('connected')
    await vi.advanceTimersByTimeAsync(45_000)
    expect(setStatus).toHaveBeenLastCalledWith('disconnected')
    expect(cancel).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchStream).toHaveBeenCalledTimes(2)
  })

  it('ignores a delayed snapshot after its generation is stopped', async () => {
    let resolveSnapshot!: (response: Response) => void
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ contractVersion: 1, data: { sessionIds: ['old'] } })))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveSnapshot = resolve
          }),
      )
    vi.stubGlobal('fetch', apiFetch)
    const queryClient = new QueryClient()
    const fetchStream = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: new ReadableStream({
        start(c) {
          c.enqueue(encoder.encode(`data: ${ready}\n\n`))
        },
      }),
    })
    stop = startMobileSync({
      connection,
      queryClient,
      fetchStream,
      setStatus: vi.fn(),
      markEvent: vi.fn(),
      onUnauthorized: vi.fn(),
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(apiFetch).toHaveBeenCalledTimes(2)
    stop()
    resolveSnapshot(
      new Response(
        JSON.stringify({
          contractVersion: 1,
          data: {
            snapshotSeq: 1,
            subscriptionId: 's',
            activationToken: 'a',
            snapshot: { items: [], status: 'running', queue: {}, jobs: {}, interactions: [] },
          },
        }),
      ),
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(queryClient.getQueryData(['session-events', 'old'])).toBeUndefined()
    expect(apiFetch).toHaveBeenCalledTimes(2)
  })

  it('parses CRLF frames split across chunks and accepts comment heartbeats', async () => {
    const onEvent = vi.fn()
    const onActivity = vi.fn()
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const chunk of [': heartbeat\r', '\n\r\n', `data: ${ready}\r`, '\n\r', '\n'])
          c.enqueue(encoder.encode(chunk))
        c.close()
      },
    })
    await consumeEventStream(
      async () => ({ ok: true, status: 200, body }),
      connection.gatewayUrl,
      'Bearer test',
      new AbortController().signal,
      onEvent,
      onActivity,
    )
    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(onEvent.mock.calls[0][0].type).toBe('gateway/ready')
    expect(onActivity).toHaveBeenCalledTimes(5)
  })
})
