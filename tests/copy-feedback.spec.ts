import { describe, expect, it } from 'vitest'
import {
  copyCodeLabel,
  copyTableLabel,
  copyTextLabel,
  formatCount,
  measureCopy,
} from '../src/components/copy-feedback.ts'

describe('copy measurement', () => {
  it('counts a single line as one line with its characters', () => {
    expect(measureCopy('done')).toEqual({ lines: 1, chars: 4 })
  })

  it('counts every newline-separated line', () => {
    expect(measureCopy('one\ntwo\nthree')).toEqual({ lines: 3, chars: 13 })
  })

  it('treats a trailing newline as the last line terminator, not an empty line', () => {
    expect(measureCopy('one\ntwo\n')).toEqual({ lines: 2, chars: 8 })
  })

  it('reports an empty payload as nothing copied', () => {
    expect(measureCopy('')).toEqual({ lines: 0, chars: 0 })
  })

  it('counts a character outside the basic plane once', () => {
    // Spread iteration keeps an emoji one character instead of two UTF-16 units.
    expect(measureCopy('🙂').chars).toBe(1)
  })
})

describe('count formatting', () => {
  it('leaves counts below a thousand unchanged', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(999)).toBe('999')
  })

  it('groups thousands with commas', () => {
    expect(formatCount(1000)).toBe('1,000')
    expect(formatCount(1234567)).toBe('1,234,567')
  })

  it('never prints a negative or non-finite count', () => {
    expect(formatCount(-5)).toBe('0')
    expect(formatCount(Number.NaN)).toBe('0')
  })
})

describe('copy confirmations', () => {
  it('names the lines and characters of a text copy', () => {
    expect(copyTextLabel(measureCopy('one\ntwo'))).toBe('已复制 2 行 · 7 字')
  })

  it('groups a large character count', () => {
    expect(copyTextLabel({ lines: 42, chars: 1234 })).toBe('已复制 42 行 · 1,234 字')
  })

  it('names only the line count of a code copy', () => {
    expect(copyCodeLabel(58)).toBe('已复制 58 行')
  })

  it('names the rows and columns of a table copy', () => {
    expect(copyTableLabel({ rows: 12, columns: 5 })).toBe('已复制 12 行 × 5 列')
  })
})
