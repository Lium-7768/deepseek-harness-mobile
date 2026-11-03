import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestJson, RequestCancelledError, RequestTimeoutError } from '@/api/request'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('gateway request lifecycle', () => {
  it('aborts a hung response body at its deadline', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, init: RequestInit) =>
        Promise.resolve({
          ok: true,
          json: () =>
            new Promise((_resolve, reject) =>
              init.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
            ),
        }),
      ),
    )
    const result = requestJson('https://desktop.test', {}, { timeoutMs: 100 })
    const assertion = expect(result).rejects.toBeInstanceOf(RequestTimeoutError)
    await vi.advanceTimersByTimeAsync(100)
    await assertion
    expect(vi.getTimerCount()).toBe(0)
  })

  it('propagates caller cancellation without treating it as a network failure', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')))
          }),
      ),
    )
    const result = requestJson('https://desktop.test', {}, { signal: controller.signal })
    controller.abort()
    await expect(result).rejects.toBeInstanceOf(RequestCancelledError)
  })

  it('does not start requests canceled before dispatch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(requestJson('https://desktop.test', {}, { signal: AbortSignal.abort() })).rejects.toBeInstanceOf(
      RequestCancelledError,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
