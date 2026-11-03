import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * RNTL ships CommonJS helpers, so Vitest's ESM vi.mock cannot supply their RN import.
 * These portable component tests mock native host views; the query helpers only
 * need StyleSheet.flatten. Keep the same style-array semantics without parsing RN's Flow entry in Node.
 */
const nativePath = require.resolve('react-native')
function flatten(style: unknown): object | undefined {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten))
  return style !== null && typeof style === 'object' ? style : undefined
}
require.cache[nativePath] = {
  id: nativePath,
  filename: nativePath,
  loaded: true,
  exports: { StyleSheet: { flatten } },
} as NodeModule

export const { render, act, cleanup, fireEvent } =
  require('@testing-library/react-native/pure') as typeof import('@testing-library/react-native/pure')
export type { RenderResult } from '@testing-library/react-native'
