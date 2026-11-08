import { describe, expect, it } from 'vitest'
import { userReferences } from '@/components/user-references'

describe('user message references', () => {
  it('reads the canonical session mention the composer inserted', () => {
    expect(userReferences('接着 @[旧会话](dsh-session:s-1) 聊')).toEqual([{ kind: 'session', label: '旧会话' }])
  })

  it('keeps plain and quoted file mentions apart from the session ones', () => {
    expect(userReferences('看 @src/app.ts 和 @"my dir/a.md"')).toEqual([
      { kind: 'file', label: 'src/app.ts' },
      { kind: 'file', label: 'my dir/a.md' },
    ])
  })

  it('ignores an address-like token and a bare at sign', () => {
    expect(userReferences('mail me@example.com @')).toEqual([])
  })
})
