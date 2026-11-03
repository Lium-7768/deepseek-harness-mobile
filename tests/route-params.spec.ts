import { describe, expect, it } from 'vitest'
import { firstParam, requireClient, withErrorContext } from '../src/components/route-params.ts'

describe('route parameters', () => {
  it('reads the first usable value from either parameter form', () => {
    expect(firstParam('session-1')).toBe('session-1')
    expect(firstParam(['  session-2  ', 'session-3'])).toBe('session-2')
    expect(firstParam(['   ', 'session-4'])).toBe('session-4')
    expect(firstParam(undefined)).toBeUndefined()
    expect(firstParam(['', '  '])).toBeUndefined()
  })

  it('narrows a missing client into a named failure instead of a silent skip', () => {
    const client = { call: () => undefined }
    expect(requireClient(client, 'needs a connection')).toBe(client)
    expect(() => requireClient(undefined, 'needs a connection')).toThrow('needs a connection')
  })

  it('prefixes a request failure with the action that failed', () => {
    const line = withErrorContext('发送失败', new Error('gateway closed'))
    expect(line.startsWith('发送失败：')).toBe(true)
    expect(line.length).toBeGreaterThan('发送失败：'.length)
  })
})
