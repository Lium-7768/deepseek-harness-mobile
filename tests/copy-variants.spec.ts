import { compactJson, parseJsonPayload, prettyJson } from '@/components/copy-variants'
import { formatQuoteText } from '@/components/markdown-quote'
import { describe, expect, it } from 'vitest'

describe('copy variants', () => {
  it('parses an object or array payload and rejects everything else', () => {
    expect(parseJsonPayload('{"a":1}')).toEqual({ a: 1 })
    expect(parseJsonPayload('[1,2]')).toEqual([1, 2])
    expect(parseJsonPayload('plain text')).toBeUndefined()
    expect(parseJsonPayload('{broken')).toBeUndefined()
    expect(parseJsonPayload('')).toBeUndefined()
  })

  it('renders the two JSON forms the desktop offers', () => {
    const value = { b: 2, a: [1, 2] }
    expect(prettyJson(value)).toBe('{\n  "b": 2,\n  "a": [\n    1,\n    2\n  ]\n}')
    expect(compactJson(value)).toBe('{"b":2,"a":[1,2]}')
  })
})

describe('quoted text', () => {
  it('prefixes one marker per line, matching the desktop formatter', () => {
    expect(formatQuoteText('one\ntwo')).toBe('> one\n> two')
    expect(formatQuoteText('one\r\ntwo')).toBe('> one\n> two')
    expect(formatQuoteText('')).toBe('> ')
  })
})
