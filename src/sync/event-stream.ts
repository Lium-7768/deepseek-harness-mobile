import type { MobileStreamEvent } from '@/types/mobile'
import { MobileEventStreamError } from './errors'

export type StreamFetch = (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'body'>>

/** Decodes SSE across arbitrary chunk boundaries, including CRLF and comment heartbeats. */
export async function consumeEventStream(
  fetchStream: StreamFetch,
  url: string,
  authorization: string,
  signal: AbortSignal,
  onEvent: (event: MobileStreamEvent) => void,
  onActivity: () => void,
): Promise<void> {
  const response = await fetchStream(url, {
    headers: { Accept: 'text/event-stream', Authorization: authorization },
    signal,
  })
  if (signal.aborted) return
  if (!response.ok || response.body === null) throw new MobileEventStreamError(response.status)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const cancel = (): void => {
    void reader.cancel().catch(() => undefined)
  }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done || signal.aborted) return
      onActivity()
      buffer += decoder.decode(value, { stream: true })
      // Do not normalize individual chunks: a CR and LF may arrive separately.
      let boundary: RegExpExecArray | null
      while ((boundary = /\r?\n\r?\n/.exec(buffer)) !== null) {
        const chunk = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary[0].length)
        const data = chunk
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, ''))
          .join('\n')
        const event = parseMobileStreamEvent(data)
        if (event && !signal.aborted) onEvent(event)
      }
      if (buffer.length > 4_000_000) throw new Error('SSE frame exceeds mobile limit')
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

export function parseMobileStreamEvent(data: string): MobileStreamEvent | undefined {
  if (data === '') return undefined
  try {
    const value: unknown = JSON.parse(data)
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
    const event = value as Record<string, unknown>
    if (event.contractVersion !== 1 || typeof event.eventId !== 'string' || typeof event.type !== 'string')
      return undefined
    if (event.payload === null || typeof event.payload !== 'object' || Array.isArray(event.payload)) return undefined
    return {
      contractVersion: 1,
      eventId: event.eventId,
      type: event.type,
      payload: event.payload as Record<string, unknown>,
      ...(typeof event.sessionId === 'string' ? { sessionId: event.sessionId } : {}),
      ...(typeof event.seq === 'number' && Number.isInteger(event.seq) && event.seq >= 0 ? { seq: event.seq } : {}),
      ...(event.snapshot === true ? { snapshot: true } : {}),
    }
  } catch {
    return undefined
  }
}
