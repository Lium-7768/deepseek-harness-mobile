/**
 * Design tokens projected from the desktop client's design system
 * (`@deepseek-ai/dsh-client-ui-theme`, `src/styles/design-platform.css`).
 *
 * Every value here is the resolved result of that stylesheet's
 * `--dsw-static-*` palette and `--dsw-alias-*` semantic layer for the light
 * (`body`) and dark (`body[data-ds-dark-theme]`) blocks. Keeping the mobile
 * client on the same values is what makes a native screen read as the same
 * product as the Web and Desktop clients.
 *
 * Do not hand-tune these colours. When the desktop stylesheet changes, re-derive
 * the values instead of inventing an approximation.
 */

/** Resolved colour value for one semantic role in both appearances. */
export interface AppearanceValue {
  /** Value used by the light appearance. */
  light: string
  /** Value used by the dark appearance. */
  dark: string
}

/**
 * Semantic colour roles, named after the desktop alias tokens they project.
 * The suffix-free keys map to `--dsw-alias-<name>`.
 */
export const aliases = {
  /** `bg-base` — the page colour behind every surface. */
  bgBase: { light: 'rgb(255, 255, 255)', dark: 'rgb(21, 21, 23)' },
  /** `bg-layer-1` — first raised surface: cards, sheets. */
  bgLayer1: { light: 'rgb(255, 255, 255)', dark: 'rgb(35, 35, 36)' },
  /** `bg-layer-2` — second raised surface: menus, popovers. */
  bgLayer2: { light: 'rgb(255, 255, 255)', dark: 'rgb(44, 44, 46)' },
  /** `bg-module-platform` — the neutral fill used for grouped rows and rails. */
  bgModule: { light: 'rgb(245, 246, 247)', dark: 'rgb(53, 54, 56)' },
  /** `bg-overlay` — scrim behind a modal sheet. */
  bgOverlay: { light: 'rgb(233, 236, 242)', dark: 'rgb(97, 102, 107)' },
  /** `bg-skeleton` — placeholder fill while first content loads. */
  bgSkeleton: { light: 'rgba(0, 0, 0, 0.04)', dark: 'rgba(255, 255, 255, 0.08)' },
  /** `bg-mask-1` — drawer and sheet backdrop. */
  mask1: { light: 'rgba(0, 0, 0, 0.24)', dark: 'rgba(0, 0, 0, 0.5)' },
  /** `label-primary` — body text. */
  label: { light: 'rgb(15, 17, 21)', dark: 'rgb(249, 250, 251)' },
  /** `label-secondary` — supporting text. */
  labelSecondary: { light: 'rgb(97, 102, 107)', dark: 'rgb(207, 211, 214)' },
  /** `label-tertiary` — metadata and placeholders. */
  labelTertiary: { light: 'rgb(129, 133, 140)', dark: 'rgb(173, 178, 184)' },
  /** `label-dimmed` — disabled text. */
  labelDimmed: { light: 'rgb(225, 229, 238)', dark: 'rgb(67, 69, 74)' },
  /** `border-l1` — the thinnest divider, for adjacent same-surface rows. */
  borderL1: { light: 'rgba(0, 0, 0, 0.04)', dark: 'rgba(255, 255, 255, 0.06)' },
  /** `border-l2` — standard divider. */
  borderL2: { light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.12)' },
  /** `border-l3` — emphasised divider and control outline. */
  borderL3: { light: 'rgba(0, 0, 0, 0.12)', dark: 'rgba(255, 255, 255, 0.16)' },
  /** `border-l4` — strongest outline, for focused controls. */
  borderL4: { light: 'rgba(0, 0, 0, 0.16)', dark: 'rgba(255, 255, 255, 0.2)' },
  /** `brand-primary` — the product's primary action colour: near-black, not blue. */
  brand: { light: 'rgb(15, 17, 21)', dark: 'rgb(249, 250, 251)' },
  /** `button-primary-dimmed` — a primary action that cannot run. */
  primaryDimmed: { light: 'rgb(235, 238, 242)', dark: 'rgb(67, 69, 74)' },
  /** `button-elevated-fill` — the neutral raised button, as in the desktop's new-session control. */
  elevatedFill: { light: 'rgb(255, 255, 255)', dark: 'rgb(67, 69, 74)' },
  /** `button-ghost-active-border` — outline of a selected ghost control. */
  ghostActiveBorder: { light: 'rgb(151, 157, 166)', dark: 'rgb(129, 133, 140)' },
  /** Full-screen viewer backdrop over a photo. Same in both appearances: it sits on media. */
  overlayMedia: { light: 'rgba(0, 0, 0, 0.94)', dark: 'rgba(0, 0, 0, 0.94)' },
  /** Busy overlay while a scan or capture completes. */
  overlayBusy: { light: 'rgba(0, 0, 0, 0.64)', dark: 'rgba(0, 0, 0, 0.64)' },
  /** Camera viewfinder overlay. */
  scrimCamera: { light: 'rgba(15, 23, 42, 0.72)', dark: 'rgba(15, 23, 42, 0.72)' },
  /** A control drawn on top of a photo. */
  controlOnMedia: { light: 'rgba(20, 25, 34, 0.8)', dark: 'rgba(20, 25, 34, 0.8)' },
  /** Hairline around a control on top of a photo. */
  borderOnMedia: { light: 'rgba(255, 255, 255, 0.5)', dark: 'rgba(255, 255, 255, 0.5)' },
  /** `interactive-bg-hover` — the tint a hovered or selected list row carries. */
  interactiveHover: { light: 'rgba(38, 49, 72, 0.06)', dark: 'rgba(255, 255, 255, 0.08)' },
  /** `interactive-bg-active` — the tint while a row is held down. */
  interactiveActive: { light: 'rgba(38, 49, 72, 0.1)', dark: 'rgba(255, 255, 255, 0.14)' },
  /** `button-primary-hover` — primary action under the pointer. */
  brandHover: { light: 'rgb(67, 69, 74)', dark: 'rgb(235, 238, 242)' },
  /** Text and glyphs drawn on top of `brand`. */
  onBrand: { light: 'rgb(255, 255, 255)', dark: 'rgb(21, 21, 23)' },
  /** `button-ghost-active-fill` — a pressed or selected ghost control. */
  ghostActive: { light: 'rgb(235, 238, 242)', dark: 'rgb(67, 69, 74)' },
  /** `button-floating-fill` — a floating control over content. */
  floating: { light: 'rgb(255, 255, 255)', dark: 'rgb(44, 44, 46)' },
  /** `button-floating-hover` — a floating control under the pointer. */
  floatingHover: { light: 'rgb(241, 243, 245)', dark: 'rgb(53, 54, 56)' },
  /** `state-business-primary` — the blue reserved for links, selection, and info. */
  business: { light: 'rgb(65, 118, 230)', dark: 'rgb(122, 170, 255)' },
  /** `link` — inline links in rendered content. */
  link: { light: 'rgb(65, 118, 230)', dark: 'rgb(122, 170, 255)' },
  /** `state-success-primary` — success state and affordance. */
  success: { light: 'rgb(34, 197, 94)', dark: 'rgb(34, 197, 94)' },
  /** `markdown-code-block` — the code block surface. */
  codeBlock: { light: 'rgb(249, 250, 251)', dark: 'rgb(27, 27, 28)' },
  /** `markdown-code-block-banner` — the code block header strip. */
  codeBanner: { light: 'rgb(249, 250, 251)', dark: 'rgb(44, 44, 46)' },
  /** `markdown-inline-code` — the inline code chip. */
  codeInline: { light: 'rgb(250, 250, 250)', dark: 'rgb(41, 41, 41)' },
} as const satisfies Record<string, AppearanceValue>

/** Colour role name defined by {@link aliases}. */
export type AliasName = keyof typeof aliases

/** The single appearance a screen renders in. */
export type Appearance = 'light' | 'dark'
