import { describe, expect, it } from 'vitest'
import { tableToTsv } from '../src/components/markdown-table-logic.ts'

describe('table clipboard serialization', () => {
  it('prints the header first, tabs between columns and newlines between rows', () => {
    expect(
      tableToTsv({
        header: ['Key', 'Value'],
        rows: [
          ['dock', '22'],
          ['row', '36'],
        ],
      }),
    ).toBe('Key\tValue\ndock\t22\nrow\t36')
  })

  it('keeps a pipe character, which is ordinary cell content outside markdown', () => {
    expect(tableToTsv({ header: ['Command'], rows: [['a | b']] })).toBe('Command\na | b')
  })

  it('preserves empty cells so the column count stays aligned', () => {
    expect(tableToTsv({ header: ['a', 'b', 'c'], rows: [['1', '', '3']] })).toBe('a\tb\tc\n1\t\t3')
  })

  it('collapses a tab or newline inside a cell so the structure survives', () => {
    expect(tableToTsv({ header: ['a'], rows: [['one\ttwo'], ['three\nfour']] })).toBe('a\none two\nthree four')
  })

  it('trims the padding a padded markdown cell carries', () => {
    expect(tableToTsv({ header: [' a ', ' b '], rows: [[' 1 ', ' 2 ']] })).toBe('a\tb\n1\t2')
  })

  it('prints a header-only table as one line', () => {
    expect(tableToTsv({ header: ['only'], rows: [] })).toBe('only')
  })
})
