import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import type { AppTheme } from '@/theme'

const highlighter = createLowlight({ javascript, typescript, json, bash, python, css, xml })
const aliases: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  shell: 'bash',
  py: 'python',
  html: 'xml',
}

export type CodeToken = {
  text: string
  kind?: 'keyword' | 'string' | 'comment' | 'constant' | 'function' | 'parameter'
}

/** Highlight only the declared language. Unsupported or very large blocks stay lossless plain text. */
export function highlightCode(text: string, language?: string): CodeToken[] {
  const normalized = language?.toLowerCase() ?? ''
  const name = aliases[normalized] ?? normalized
  if (!highlighter.registered(name) || text.length > 50_000) return [{ text }]
  const tokens: CodeToken[] = []
  const walk = (
    node: { type: string; value?: string; properties?: { className?: (string | number)[] }; children?: unknown[] },
    inherited?: CodeToken['kind'],
  ): void => {
    const classes = node.properties?.className?.map(String) ?? []
    const kind: CodeToken['kind'] = classes.some((value) => /keyword|built_in/.test(value))
      ? 'keyword'
      : classes.some((value) => /string|regexp/.test(value))
        ? 'string'
        : classes.some((value) => /comment/.test(value))
          ? 'comment'
          : classes.some((value) => /number|literal|attr/.test(value))
            ? 'constant'
            : classes.some((value) => /title|function/.test(value))
              ? 'function'
              : classes.some((value) => /params/.test(value))
                ? 'parameter'
                : inherited
    if (node.type === 'text' && node.value) {
      const previous = tokens.at(-1)
      if (previous && previous.kind === kind) previous.text += node.value
      else tokens.push({ text: node.value, ...(kind ? { kind } : {}) })
    }
    for (const child of node.children ?? []) walk(child as Parameters<typeof walk>[0], kind)
  }
  walk(highlighter.highlight(name, text))
  return tokens
}

export function codeTokenColor(theme: AppTheme, kind?: CodeToken['kind']): string {
  const roles = {
    keyword: theme.colors.syntaxKeyword,
    string: theme.colors.syntaxString,
    comment: theme.colors.syntaxComment,
    constant: theme.colors.syntaxConstant,
    function: theme.colors.syntaxFunction,
    parameter: theme.colors.syntaxParameter,
  }
  return kind ? roles[kind] : theme.colors.codeForeground
}
