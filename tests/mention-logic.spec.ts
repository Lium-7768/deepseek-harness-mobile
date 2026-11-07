import { describe, expect, it } from 'vitest'
import {
  MENTION_ROW_LIMIT,
  applyMentionPick,
  formatFileMention,
  mentionRows,
  mentionTrigger,
  pickMention,
} from '@/components/mention-logic'
import type { MobileReferencePayload } from '@/types/mobile'

const empty: MobileReferencePayload = { files: [], sessions: [] }

describe('mention trigger detection', () => {
  it('opens on an at sign that begins a token', () => {
    expect(mentionTrigger('@', 1)).toEqual({ end: 1, kind: 'mention', query: '', quoted: false, start: 0 })
    expect(mentionTrigger('@src/', 5)).toEqual({ end: 5, kind: 'mention', query: 'src/', quoted: false, start: 0 })
    expect(mentionTrigger('see @src/app', 12)).toEqual({
      end: 12,
      kind: 'mention',
      query: 'src/app',
      quoted: false,
      start: 4,
    })
  })

  it('reads the quoted form and keeps its quote open', () => {
    expect(mentionTrigger('@"my dir/', 9)).toEqual({
      end: 9,
      kind: 'mention',
      query: 'my dir/',
      quoted: true,
      start: 0,
    })
  })

  it('stays shut inside a word and away from the caret', () => {
    // An email address is prose, not a reference.
    expect(mentionTrigger('me@example', 10)).toBeUndefined()
    expect(mentionTrigger('@src done', 9)).toBeUndefined()
    expect(mentionTrigger('', 0)).toBeUndefined()
  })

  it('clamps a caret past the end of the draft', () => {
    expect(mentionTrigger('@a', 40)?.query).toBe('a')
  })
})

describe('mention formatting', () => {
  it('leaves a plain path unquoted and a spaced path quoted', () => {
    expect(formatFileMention('src/app.ts', 'file', false)).toBe('@src/app.ts')
    expect(formatFileMention('my dir/a.ts', 'file', false)).toBe('@"my dir/a.ts"')
    expect(formatFileMention('src', 'directory', false)).toBe('@src/')
    expect(formatFileMention('my dir', 'directory', false)).toBe('@"my dir/')
  })

  it('keeps the reader quote when a pick fills a quoted token', () => {
    expect(formatFileMention('src/app.ts', 'file', true)).toBe('@"src/app.ts"')
  })

  it('refuses a path the grammar cannot carry', () => {
    expect(formatFileMention('a"b.ts', 'file', false)).toBeUndefined()
    expect(formatFileMention('a\u0007b.ts', 'file', false)).toBeUndefined()
  })
})

describe('mention picks', () => {
  it('replaces the token and leaves the caret after a trailing space', () => {
    const trigger = mentionTrigger('look @sr', 8)!
    expect(applyMentionPick('look @sr', trigger, '@src/app.ts')).toEqual({
      caret: 17,
      text: 'look @src/app.ts ',
    })
  })

  it('leaves a directory mention open for the rest of the path', () => {
    const trigger = mentionTrigger('@sr', 3)!
    expect(pickMention('@sr', trigger, { kind: 'directory', label: 'src', mention: '@src/' })).toEqual({
      caret: 5,
      text: '@src/',
    })
  })

  it('inserts a Session mention verbatim', () => {
    const trigger = mentionTrigger('@old', 4)!
    const mention = '@[旧会话](dsh-session:s1)'
    expect(pickMention('@old', trigger, { kind: 'session', label: '旧会话', mention })).toEqual({
      caret: mention.length + 1,
      text: `${mention} `,
    })
  })
})

describe('mention rows', () => {
  it('lists files before Sessions and caps each source', () => {
    const files = Array.from({ length: MENTION_ROW_LIMIT + 2 }, (_, index) => ({
      kind: 'file' as const,
      path: `src/f${index}.ts`,
    }))
    const sessions = [
      {
        createdAt: 1,
        label: '会话一',
        mention: '@[会话一](dsh-session:s1)',
        sameWorkspace: true,
        sessionId: 's1',
      },
      {
        createdAt: 2,
        label: '会话二',
        mention: '@[会话二](dsh-session:s2)',
        sameWorkspace: false,
        sessionId: 's2',
      },
    ]
    const rows = mentionRows({ files, sessions }, false)
    expect(rows).toHaveLength(MENTION_ROW_LIMIT + 2)
    expect(rows[0]).toEqual({ kind: 'file', label: 'src/f0.ts', mention: '@src/f0.ts' })
    expect(rows.slice(-2)).toEqual([
      { kind: 'session', label: '会话一', mention: '@[会话一](dsh-session:s1)' },
      // A Session outside this workspace shows its id, since no path does.
      { detail: 's2', kind: 'session', label: '会话二', mention: '@[会话二](dsh-session:s2)' },
    ])
  })

  it('prefers a subagent creation label and drops unformattable paths', () => {
    const rows = mentionRows(
      {
        files: [{ kind: 'file', path: 'a"b.ts' }],
        sessions: [
          {
            createdAt: 1,
            displayTitle: '子代理',
            label: 'opaque-id',
            mention: '@[子代理](dsh-session:c1)',
            sameWorkspace: true,
            sessionId: 'c1',
          },
        ],
      },
      false,
    )
    expect(rows).toEqual([{ kind: 'session', label: '子代理', mention: '@[子代理](dsh-session:c1)' }])
  })

  it('reports an empty query result as no rows', () => {
    expect(mentionRows(empty, false)).toEqual([])
  })
})
