/** Ordinary HTTP requests have a deadline; the event stream owns its own idle timeout. */
export const REQUEST_TIMEOUT_MS = 30_000

export interface RequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

export class RequestTimeoutError extends Error {
  constructor() {
    super('Gateway request timed out')
    this.name = 'RequestTimeoutError'
  }
}

export class RequestCancelledError extends Error {
  constructor() {
    super('Gateway request cancelled')
    this.name = 'AbortError'
  }
}

/** Keeps the deadline active through response-body decoding, and disposes listeners on every path. */
export async function requestJson(
  url: string,
  init: RequestInit,
  options: RequestOptions = {},
): Promise<{
  response: Response
  decoded: unknown
  decodeError?: unknown
}> {
  const controller = new AbortController()
  const cancel = (): void => controller.abort()
  if (options.signal?.aborted) throw new RequestCancelledError()
  options.signal?.addEventListener('abort', cancel, { once: true })
  let timedOut = false
  const deadline = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, options.timeoutMs ?? REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    let decoded: unknown
    let decodeError: unknown
    try {
      decoded = await response.json()
    } catch (error) {
      decodeError = error
    }
    if (timedOut) throw new RequestTimeoutError()
    if (controller.signal.aborted) throw new RequestCancelledError()
    return { response, decoded, decodeError }
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError()
    if (controller.signal.aborted) throw new RequestCancelledError()
    throw error
  } finally {
    clearTimeout(deadline)
    options.signal?.removeEventListener('abort', cancel)
  }
}
