import type { AppTheme } from './index'

/**
 * Colour role of a tertiary reading.
 *
 * The type scale comes from the desktop client, so the size–line pairs are
 * fixed: `eyebrow` 11/16, `caption` 12/18, `label` 12/20, `body` 13/20,
 * `bodyWide` 13/24, `paragraph` 14/22, `message` 14/24. Naming the roles keeps
 * a caption in one place from drifting to 12/20 while the next one stays at
 * 12/18.
 */
export type TextRole = 'body' | 'bodyWide' | 'caption' | 'eyebrow' | 'label' | 'message' | 'paragraph'

const typeScale: Record<TextRole, { fontSize: number; lineHeight: number }> = {
  eyebrow: { fontSize: 11, lineHeight: 16 },
  caption: { fontSize: 12, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 20 },
  body: { fontSize: 13, lineHeight: 20 },
  bodyWide: { fontSize: 13, lineHeight: 24 },
  paragraph: { fontSize: 14, lineHeight: 22 },
  message: { fontSize: 14, lineHeight: 24 },
}

/**
 * Builds one text style from the shared scale and a colour role.
 *
 * @param theme - Active appearance.
 * @param role - Which size–line pair the text uses.
 * @param tone - Colour role; `primary` is the body ink, `tertiary` the quietest reading.
 * @param weight - Optional weight, only where the desktop sets one.
 * @returns A style object for a `<Text>`.
 */
export function textStyle(
  theme: AppTheme,
  role: TextRole,
  tone: 'primary' | 'secondary' | 'tertiary' | 'caption' = 'primary',
  weight?: '400' | '500' | '600',
): { color: string; fontSize: number; lineHeight: number; fontWeight?: '400' | '500' | '600' } {
  const ink =
    tone === 'primary'
      ? theme.colors.ink
      : tone === 'secondary'
        ? theme.colors.inkMuted
        : tone === 'tertiary'
          ? theme.colors.inkTertiary
          : theme.colors.inkFaint
  return { color: ink, ...typeScale[role], ...(weight === undefined ? {} : { fontWeight: weight }) }
}
