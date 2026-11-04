import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * RNTL ships CommonJS helpers, so Vitest's ESM vi.mock cannot supply their RN import.
 * These portable component tests mock native host views; the query helpers only
 * need StyleSheet.flatten. Keep the same style-array semantics without parsing RN's Flow entry in Node.
 * This shim does not validate native layout, animation, or platform behavior.
 * Fail loudly if an RNTL upgrade starts depending on additional RN surfaces.
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
  exports: new Proxy(
    { StyleSheet: { flatten } },
    {
      get(target, name, receiver) {
        if (name === '__esModule') return false
        if (!(name in target))
          throw new Error(
            `RNTL requested unsupported React Native surface: ${String(name)}. Update the test shim and verify native behavior.`,
          )
        return Reflect.get(target, name, receiver)
      },
    },
  ),
} as NodeModule

export const { render, act, cleanup, fireEvent } =
  require('@testing-library/react-native/pure') as typeof import('@testing-library/react-native/pure')
export type { RenderResult } from '@testing-library/react-native'
