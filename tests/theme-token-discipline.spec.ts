import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Every `.ts`/`.tsx` file under one directory tree. */
function sources(root: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(root)) {
    const path = join(root, name)
    if (statSync(path).isDirectory()) {
      // The theme owns literal colour values; nothing else may.
      if (path.endsWith('/theme') || path.endsWith('/locale')) continue
      out.push(...sources(path))
      continue
    }
    if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(path)
  }
  return out
}

describe('colour tokens', () => {
  it('leaves no literal hex colour outside the theme', () => {
    const offenders: string[] = []
    for (const file of [...sources('app'), ...sources('src')]) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/'#[0-9a-fA-F]{3,8}'/g)) {
        offenders.push(`${file}: ${match[0]}`)
      }
    }
    // A literal colour cannot follow the appearance, so a dark surface would keep
    // the light value. Every colour comes from a role instead.
    expect(offenders).toEqual([])
  })
})
