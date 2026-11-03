import { describe, expect, it } from 'vitest'
import { parseBlocks, parseTableAlign, splitTableRow, tableLayout } from '../src/components/markdown-blocks.ts'

describe('markdown table parsing', () => {
  it('splits a row with or without the edge pipes', () => {
    expect(splitTableRow('| 控件 | 之前 | 现在 |')).toEqual(['控件', '之前', '现在'])
    expect(splitTableRow('a | b')).toEqual(['a', 'b'])
    expect(splitTableRow('| only |')).toEqual(['only'])
  })

  it('keeps an escaped pipe inside its cell', () => {
    expect(splitTableRow('| a \\| b | c |')).toEqual(['a | b', 'c'])
  })

  it('reads alignments from the delimiter row', () => {
    expect(parseTableAlign('| --- | :--: | --: |')).toEqual(['left', 'center', 'right'])
    expect(parseTableAlign('| :--- | ---: |')).toEqual(['left', 'right'])
    expect(parseTableAlign('not a delimiter')).toBeUndefined()
    expect(parseTableAlign('| text | text |')).toBeUndefined()
  })

  it('parses a table into header, alignments, and body rows', () => {
    const blocks = parseBlocks(
      ['| 控件 | 之前 |', '| --- | ---: |', '| 统计 pill | 静态 View |', '| `+` | Alert |'].join('\n'),
    )
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      kind: 'table',
      header: ['控件', '之前'],
      align: ['left', 'right'],
      rows: [
        ['统计 pill', '静态 View'],
        ['`+`', 'Alert'],
      ],
    })
  })

  it('stops the table when the pipe rows end', () => {
    const blocks = parseBlocks(['| a | b |', '| --- | --- |', '| 1 | 2 |', '', 'after'].join('\n'))
    expect(blocks.map((block) => block.kind)).toEqual(['table', 'paragraph'])
    expect(blocks[1]?.text).toBe('after')
  })

  it('leaves a pipe line without a delimiter row as a paragraph', () => {
    const blocks = parseBlocks('a | b\nc | d')
    expect(blocks.map((block) => block.kind)).toEqual(['paragraph'])
  })

  it('does not open a table inside a fenced code block', () => {
    const blocks = parseBlocks(['```', '| a | b |', '| --- | --- |', '```'].join('\n'))
    expect(blocks.map((block) => block.kind)).toEqual(['code'])
  })

  it('still parses the blocks around a table', () => {
    const blocks = parseBlocks(
      ['## 修复前 vs 修复后', '', '| a | b |', '| --- | --- |', '| 1 | 2 |', '', '- 末尾'].join('\n'),
    )
    expect(blocks.map((block) => block.kind)).toEqual(['heading', 'table', 'list'])
  })
})

describe('markdown table layout', () => {
  const parse = (markdown: string) => parseBlocks(markdown)[0]!

  it('fills the column below four columns and scrolls from four on', () => {
    expect(tableLayout(parse('| a | b |\n| --- | --- |\n| 1 | 2 |')).fills).toBe(true)
    expect(tableLayout(parse('| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |')).fills).toBe(true)
    expect(tableLayout(parse('| a | b | c | d |\n| --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 |')).fills).toBe(false)
  })

  it('counts the widest row so a short header never clips a cell', () => {
    const layout = tableLayout(parse('| a | b |\n| --- | --- |\n| 1 | 2 | 3 | 4 |'))
    expect(layout.columns).toBe(4)
    expect(layout.align).toHaveLength(4)
  })

  it('defaults an undeclared column to left', () => {
    const layout = tableLayout(parse('| a | b |\n| :--: | --- |\n| 1 | 2 |'))
    expect(layout.align).toEqual(['center', 'left'])
  })

  it('renders the comparison table that first broke as raw text', () => {
    const markdown = [
      '| 控件 | 之前 | 现在 |',
      '| --- | --- | --- |',
      '| 统计 pill | 静态 View，点了没反应 | 打开「会话统计」面板 |',
      '| Token pill | 静态 View，点了没反应 | 打开「Token 用量」面板 |',
    ].join('\n')
    const block = parse(markdown)
    expect(block.kind).toBe('table')
    expect(block.header).toEqual(['控件', '之前', '现在'])
    expect(block.rows).toHaveLength(2)
    expect(tableLayout(block)).toMatchObject({ columns: 3, fills: true })
  })
})
