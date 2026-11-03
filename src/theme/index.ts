/**
 * Native presentation tokens projected from the desktop client's design system.
 *
 * Every colour role follows `@deepseek-ai/dsh-client-ui-theme`; see
 * `./tokens.ts` for the resolved desktop values and their provenance. Shape
 * tokens (radii, spacing, type scale, control metrics) are native decisions and
 * live here.
 *
 * Two appearances are defined. `mobileTheme` is the light appearance and keeps
 * the historic export so every existing `mobileTheme.colors.*` call site still
 * compiles; `darkTheme` carries the same keys. Read the active appearance with
 * {@link useAppTheme} instead of importing a fixed palette, so a screen follows
 * the system setting.
 */
import type { Appearance } from './tokens'

/** Shape and metric tokens shared by both appearances. */
const shape = {
  // The desktop's own radius scale (`--dsw-radius-*` in ui-theme base.css is
  // 4 / 8 / 12 / 16 / 20 / 28). Every role below resolves to one of those steps,
  // so a surface cannot drift onto a radius the desktop never uses.
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    panel: 28,
    card: 12,
    control: 8,
    bubble: 12,
    composer: 20,
    sheet: 16,
    pill: 999,
  },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  // Sizes and line heights come from the desktop's type scale
  // (ui-theme/styles/gradient-shadow-text.css): 11/14, 12/18, 13/20, 14/22,
  // 16/24, 20/28, 24/32. The conversation body is the one deliberate departure:
  // the desktop leaves it at a configurable 13px for a desk monitor, while a
  // phone read at arm's length needs the platform's body size.
  // 26 is the desktop's new-session hero size (ui-conversation EmptyHero),
  // which sits outside the shared body scale.
  /**
   * Type scale, in the desktop's own values.
   *
   * `message` is the markdown base (`--dsh-content-font-size`, 14px) on its 24px
   * line, which is what a rendered answer uses on both clients. `eyebrow` is the
   * 11px label above metadata; `caption` is the 12px supporting line.
   */
  typography: {
    eyebrow: 11,
    caption: 12,
    body: 14,
    bodyLarge: 15,
    message: 15,
    title: 20,
    hero: 26,
    lineBody: 22,
    lineTitle: 28,
    lineMessage: 24,
  },
  rail: { width: 56, button: 36, gap: 12 },
  chrome: {
    headerHeight: 44,
    headerMetaHeight: 35,
    headerWithMetaHeight: 71,
    tabHeight: 35,
    composerRadius: 20,
    // The desktop's send control is a 34px accent circle inside the composer
    // (ui-conversation InputBar); the panel radius around it is 28px.
    sendButton: 34,
    controlHeight: 36,
  },
  touch: { iconButton: 44, compactIconButton: 36, controlHeight: 40, minTarget: 44 },
  // The desktop's motion tokens (ui-theme/src/styles/base.css:15-17). The easing
  // stays control points here because this module must not import react-native;
  // `useMotionEasing` in ./hooks turns them into an RN easing function.
  motion: {
    fast: 100,
    base: 200,
    slow: 300,
    /** Control points of `cubic-bezier(0.4, 0, 0.2, 1)`, the desktop's easing. */
    bezier: [0.4, 0, 0.2, 1] as const,
  },
} as const

/** Colour roles for one appearance. */
export interface ThemeColors {
  /** Desktop ui-theme shiki.css token palette. */
  syntaxKeyword: string
  syntaxString: string
  syntaxComment: string
  syntaxConstant: string
  syntaxFunction: string
  syntaxParameter: string
  /** Page background behind every surface. */
  background: string
  /** Content canvas; equal to `background` where a screen owns no layer. */
  canvas: string
  /** Sidebar drawer fill. */
  drawerBackground: string
  /** Base card surface. */
  surface: string
  /** Surface raised above `surface`: menus and popovers. */
  surfaceRaised: string
  floating: string
  floatingHover: string
  /** Grouped-row and rail fill. */
  surfaceMuted: string
  /** Pressed or selected row fill. */
  surfaceActive: string
  /** Body text. */
  ink: string
  /** Supporting text. */
  inkMuted: string
  /**
   * Metadata text: the desktop's `label-tertiary`, used for descriptions,
   * timestamps, and any supporting line.
   */
  inkTertiary: string
  /** Placeholder text only: the desktop's composer placeholder tone. */
  inkFaint: string
  /** Standard divider. */
  border: string
  /** Emphasised divider and control outline. */
  borderStrong: string
  /** Disabled fill for an accent action. */
  accentDimmed: string
  /** The thinnest divider between adjacent same-surface rows. */
  borderHairline: string
  /** Blue reserved for links, selection, and info. */
  accent: string
  /** Text drawn on `accent`. */
  textOnAccent: string
  /** Accent-coloured text on a neutral surface. */
  accentText: string
  /** Soft accent fill behind selected chips. */
  accentSoft: string
  /** Text drawn on `accentSoft`, matching the desktop's badge label. */
  accentSoftText: string
  /** Primary action fill. Near-black, matching the desktop brand colour. */
  brand: string
  /** Primary action under the pointer. */
  brandHover: string
  interactiveHover: string
  overlayMedia: string
  overlayBusy: string
  scrimCamera: string
  controlOnMedia: string
  borderOnMedia: string
  interactiveActive: string
  /** A primary action that cannot run. */
  primaryDimmed: string
  /** The neutral raised button, as in the desktop's new-session control. */
  elevatedFill: string
  /** Outline of a selected ghost control. */
  ghostActiveBorder: string
  /** Hairline around a raised control. */
  borderL3: string
  /** Hairline one step below `borderL3`; markdown table body rules. */
  borderL2: string
  /** Text and glyphs drawn on `brand`. */
  onBrand: string
  /** Text and glyphs drawn on `accent`. */
  onAccent: string
  /** Success state. */
  success: string
  /** Success text on a neutral surface. */
  successText: string
  /** Soft success fill. */
  successSoft: string
  /** Warning state. */
  warning: string
  /** Warning text on a neutral surface. */
  warningText: string
  /** Soft warning fill. */
  warningSoft: string
  /** Destructive state. */
  danger: string
  /** Soft destructive fill. */
  dangerSoft: string
  /** Outline around a destructive action, matched to `dangerSoft`. */
  dangerBorder: string
  /** User message bubble. */
  userBubble: string
  /** Assistant message bubble. */
  assistantBubble: string
  /** Agent and activity card fill. */
  agentBubble: string
  /** Modal and drawer backdrop. */
  overlay: string
  /** Backdrop behind a navigation drawer; darker than a modal scrim. */
  scrim: string
  /** Text and glyphs drawn on a dark scrim, such as a control over a photo. */
  onScrim: string
  /** Placeholder fill shown while first content loads. */
  skeleton: string
  /** Code block surface. */
  codeBackground: string
  /** Code block banner strip; the desktop lifts it one step off the block in dark. */
  codeBanner: string
  /** Inline code chip behind a code span in running text. */
  codeInline: string
  /** Blockquote rule; the desktop's `label-caption`. */
  quoteBorder: string
  /** Context-meter legend: system-prompt segment (`static-neutral-bluish-400`). */
  meterSystem: string
  /** Context-meter legend: tool-definition segment (violet-400 literal, no platform token). */
  meterTools: string
  /** Context-meter legend: conversation segment (`static-blue-450`). */
  meterMessages: string
  /** Scrim behind a click-open composer panel, one step softer than `overlay`. */
  panelScrim: string
  /** Code block text. */
  codeForeground: string
  /** Interactive code span. */
  codeInteractive: string
  /** Code block language label. */
  codeLabel: string
  /** Success-coloured code text, including diff additions. */
  codeSuccess: string
  /** Glyph tone inside a menu and on menu rows (desktop `menu-icon`). */
  menuIcon: string
  /** Diff line tint behind an added line in a code block. */
  codeDiffAdded: string
  /** Diff line tint behind a removed line in a code block. */
  codeDiffDeleted: string
  /** Background of a changed file row in the review panel. */
  fileDiffAddedBg: string
  /** Gutter column of an added file row in the review panel. */
  fileDiffAddedGutter: string
  /** Status marker colour for an added file row. */
  fileDiffAddedMarker: string
  /** Background of a removed file row in the review panel. */
  fileDiffDeletedBg: string
  /** Gutter column of a removed file row in the review panel. */
  fileDiffDeletedGutter: string
  /** Status marker colour for a removed file row. */
  fileDiffDeletedMarker: string
  /** A finished job or turn in a progress list (desktop `state-done-primary`). */
  stateDone: string
  /** Card fill inside the settings panel. */
  settingsCardFill: string
  /** Hairline around a settings card. */
  settingsCardStroke: string
  /** Text selection inside a rendered document. */
  textSelection: string
  /** The shimmer band that sweeps a pending label. */
  labelShimmer: string
}

/** One appearance's complete token set. */
export interface AppTheme {
  /** Which appearance these colours describe. */
  appearance: Appearance
  colors: ThemeColors
  radius: typeof shape.radius
  spacing: typeof shape.spacing
  typography: typeof shape.typography
  rail: typeof shape.rail
  chrome: typeof shape.chrome
  touch: typeof shape.touch
  motion: typeof shape.motion
  elevation: {
    card: {
      shadowColor: string
      shadowOpacity: number
      shadowRadius: number
      shadowOffset: { width: number; height: number }
      elevation: number
    }
    sheet: {
      shadowColor: string
      shadowOpacity: number
      shadowRadius: number
      shadowOffset: { width: number; height: number }
      elevation: number
    }
  }
}

const lightColors: ThemeColors = {
  syntaxKeyword: '#d6336c',
  syntaxString: '#2f9e44',
  syntaxComment: '#868e96',
  syntaxConstant: '#1c7ed6',
  syntaxFunction: '#6741d9',
  syntaxParameter: '#e8590c',

  background: 'rgb(255, 255, 255)',
  canvas: 'rgb(255, 255, 255)',
  drawerBackground: 'rgb(249, 250, 251)',
  surface: 'rgb(255, 255, 255)',
  surfaceRaised: 'rgb(255, 255, 255)',
  floating: 'rgb(255, 255, 255)',
  floatingHover: 'rgb(241, 243, 245)',
  surfaceMuted: 'rgb(245, 246, 247)',
  surfaceActive: 'rgb(235, 238, 242)',
  ink: 'rgb(15, 17, 21)',
  inkMuted: 'rgb(97, 102, 107)',
  inkTertiary: 'rgb(129, 133, 140)',
  inkFaint: 'rgb(173, 178, 184)',
  border: 'rgba(0, 0, 0, 0.12)',
  borderStrong: 'rgba(0, 0, 0, 0.16)',
  borderHairline: 'rgba(0, 0, 0, 0.04)',
  accent: 'rgb(65, 118, 230)',
  /** An accent action that cannot run — the desktop's `button-primary-dimmed`. */
  accentDimmed: 'rgb(235, 238, 242)',
  textOnAccent: 'rgb(255, 255, 255)',
  accentText: 'rgb(30, 64, 175)',
  accentSoft: 'rgb(228, 237, 253)',
  accentSoftText: 'rgb(14, 48, 116)',
  brand: 'rgb(15, 17, 21)',
  brandHover: 'rgb(67, 69, 74)',
  interactiveHover: 'rgba(38, 49, 72, 0.06)',
  overlayMedia: 'rgba(0, 0, 0, 0.94)',
  overlayBusy: 'rgba(0, 0, 0, 0.64)',
  scrimCamera: 'rgba(15, 23, 42, 0.72)',
  controlOnMedia: 'rgba(20, 25, 34, 0.8)',
  borderOnMedia: 'rgba(255, 255, 255, 0.5)',
  interactiveActive: 'rgba(38, 49, 72, 0.1)',
  primaryDimmed: 'rgb(235, 238, 242)',
  elevatedFill: 'rgb(255, 255, 255)',
  ghostActiveBorder: 'rgb(151, 157, 166)',
  borderL3: 'rgba(0, 0, 0, 0.12)',
  borderL2: 'rgba(0, 0, 0, 0.1)',
  onBrand: 'rgb(255, 255, 255)',
  onAccent: 'rgb(255, 255, 255)',
  success: 'rgb(34, 197, 94)',
  successText: 'rgb(21, 128, 61)',
  successSoft: 'rgb(230, 250, 237)',
  warning: 'rgb(221, 134, 41)',
  warningText: 'rgb(154, 90, 0)',
  warningSoft: 'rgb(254, 245, 231)',
  danger: 'rgb(236, 19, 19)',
  dangerSoft: 'rgb(254, 242, 242)',
  dangerBorder: 'rgb(239, 181, 176)',
  userBubble: 'rgb(237, 243, 254)',
  assistantBubble: 'rgb(255, 255, 255)',
  agentBubble: 'rgb(247, 246, 242)',
  overlay: 'rgba(15, 17, 21, 0.38)',
  scrim: 'rgba(0, 0, 0, 0.24)',
  onScrim: 'rgb(255, 255, 255)',
  meterSystem: 'rgb(148, 163, 184)',
  meterTools: 'rgb(167, 139, 250)',
  meterMessages: 'rgb(59, 130, 246)',
  panelScrim: 'rgba(15, 17, 21, 0.12)',
  skeleton: 'rgba(0, 0, 0, 0.04)',
  codeBackground: 'rgb(249, 250, 251)',
  codeBanner: 'rgb(249, 250, 251)',
  codeInline: 'rgb(250, 250, 250)',
  quoteBorder: 'rgb(173, 178, 184)',
  codeForeground: 'rgb(15, 17, 21)',
  codeInteractive: 'rgb(65, 118, 230)',
  codeLabel: 'rgb(129, 133, 140)',
  codeSuccess: 'rgb(1, 162, 65)',
  menuIcon: 'rgb(53, 54, 56)',
  codeDiffAdded: 'rgba(34, 197, 94, 0.08)',
  codeDiffDeleted: 'rgba(236, 19, 19, 0.08)',
  fileDiffAddedBg: 'rgb(230, 244, 231)',
  fileDiffAddedGutter: 'rgb(237, 247, 237)',
  fileDiffAddedMarker: 'rgb(1, 162, 65)',
  fileDiffDeletedBg: 'rgb(252, 230, 226)',
  fileDiffDeletedGutter: 'rgb(253, 236, 233)',
  fileDiffDeletedMarker: 'rgb(186, 39, 35)',
  stateDone: 'rgb(124, 58, 237)',
  settingsCardFill: 'rgb(255, 255, 255)',
  settingsCardStroke: 'rgba(0, 0, 0, 0.16)',
  textSelection: 'rgba(59, 130, 246, 0.4)',
  labelShimmer: 'rgba(0, 0, 0, 0.3)',
}

const darkColors: ThemeColors = {
  syntaxKeyword: '#faa2c1',
  syntaxString: '#69db7c',
  syntaxComment: '#adb5bd',
  syntaxConstant: '#4dabf7',
  syntaxFunction: '#b197fc',
  syntaxParameter: '#ffa94d',

  background: 'rgb(21, 21, 23)',
  canvas: 'rgb(21, 21, 23)',
  drawerBackground: 'rgb(27, 27, 28)',
  surface: 'rgb(21, 21, 23)',
  surfaceRaised: 'rgb(44, 44, 46)',
  floating: 'rgb(44, 44, 46)',
  floatingHover: 'rgb(53, 54, 56)',
  surfaceMuted: 'rgb(53, 54, 56)',
  surfaceActive: 'rgb(67, 69, 74)',
  ink: 'rgb(249, 250, 251)',
  inkMuted: 'rgb(207, 211, 214)',
  inkTertiary: 'rgb(173, 178, 184)',
  inkFaint: 'rgb(129, 133, 140)',
  border: 'rgba(255, 255, 255, 0.16)',
  borderStrong: 'rgba(255, 255, 255, 0.2)',
  borderHairline: 'rgba(255, 255, 255, 0.06)',
  accent: 'rgb(122, 170, 255)',
  /** An accent action that cannot run — the desktop's `button-primary-dimmed`. */
  accentDimmed: 'rgb(53, 54, 56)',
  textOnAccent: 'rgb(21, 21, 23)',
  accentText: 'rgb(147, 197, 253)',
  accentSoft: 'rgba(122, 170, 255, 0.16)',
  accentSoftText: 'rgb(183, 200, 254)',
  brand: 'rgb(249, 250, 251)',
  brandHover: 'rgb(235, 238, 242)',
  interactiveHover: 'rgba(255, 255, 255, 0.08)',
  overlayMedia: 'rgba(0, 0, 0, 0.94)',
  overlayBusy: 'rgba(0, 0, 0, 0.64)',
  scrimCamera: 'rgba(15, 23, 42, 0.72)',
  controlOnMedia: 'rgba(20, 25, 34, 0.8)',
  borderOnMedia: 'rgba(255, 255, 255, 0.5)',
  interactiveActive: 'rgba(255, 255, 255, 0.14)',
  primaryDimmed: 'rgb(67, 69, 74)',
  elevatedFill: 'rgb(67, 69, 74)',
  ghostActiveBorder: 'rgb(129, 133, 140)',
  borderL3: 'rgba(255, 255, 255, 0.16)',
  borderL2: 'rgba(255, 255, 255, 0.12)',
  onBrand: 'rgb(21, 21, 23)',
  onAccent: 'rgb(255, 255, 255)',
  success: 'rgb(34, 197, 94)',
  successText: 'rgb(78, 209, 126)',
  successSoft: 'rgba(34, 197, 94, 0.16)',
  warning: 'rgb(247, 173, 49)',
  warningText: 'rgb(251, 191, 36)',
  warningSoft: 'rgba(247, 173, 49, 0.16)',
  danger: 'rgb(242, 90, 90)',
  dangerSoft: 'rgba(242, 90, 90, 0.16)',
  dangerBorder: 'rgba(242, 90, 90, 0.36)',
  userBubble: 'rgb(44, 44, 46)',
  assistantBubble: 'rgb(21, 21, 23)',
  agentBubble: 'rgb(35, 35, 36)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  scrim: 'rgba(0, 0, 0, 0.5)',
  onScrim: 'rgb(255, 255, 255)',
  meterSystem: 'rgb(148, 163, 184)',
  meterTools: 'rgb(167, 139, 250)',
  meterMessages: 'rgb(59, 130, 246)',
  panelScrim: 'rgba(0, 0, 0, 0.32)',
  skeleton: 'rgba(255, 255, 255, 0.08)',
  codeBackground: 'rgb(27, 27, 28)',
  codeBanner: 'rgb(44, 44, 46)',
  codeInline: 'rgb(41, 41, 41)',
  quoteBorder: 'rgb(129, 133, 140)',
  codeForeground: 'rgb(228, 234, 243)',
  codeInteractive: 'rgb(191, 219, 254)',
  codeLabel: 'rgb(147, 197, 253)',
  codeSuccess: 'rgb(134, 239, 172)',
  menuIcon: 'rgb(235, 238, 242)',
  codeDiffAdded: 'rgba(34, 197, 94, 0.12)',
  codeDiffDeleted: 'rgba(242, 90, 90, 0.12)',
  fileDiffAddedBg: 'rgb(31, 49, 36)',
  fileDiffAddedGutter: 'rgb(19, 32, 22)',
  fileDiffAddedMarker: 'rgb(65, 201, 119)',
  fileDiffDeletedBg: 'rgb(60, 31, 27)',
  fileDiffDeletedGutter: 'rgb(40, 19, 14)',
  fileDiffDeletedMarker: 'rgb(250, 66, 62)',
  stateDone: 'rgb(167, 139, 250)',
  settingsCardFill: 'rgb(44, 44, 46)',
  settingsCardStroke: 'rgba(255, 255, 255, 0.2)',
  textSelection: 'rgba(59, 130, 246, 0.4)',
  labelShimmer: 'rgba(255, 255, 255, 0.45)',
}

const lightElevation: AppTheme['elevation'] = {
  card: {
    shadowColor: 'rgb(23, 32, 51)',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sheet: {
    shadowColor: 'rgb(23, 32, 51)',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
}

/**
 * Dark surfaces sit above a near-black page, so a shadow reads as a light halo
 * instead. Opacity rises because a black shadow on black is invisible.
 */
const darkElevation: AppTheme['elevation'] = {
  card: {
    shadowColor: 'rgb(0, 0, 0)',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sheet: {
    shadowColor: 'rgb(0, 0, 0)',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
}

/** The light appearance. Kept as the historic default export target. */
export const mobileTheme: AppTheme = {
  appearance: 'light',
  colors: lightColors,
  ...shape,
  elevation: lightElevation,
}

/** The dark appearance. Same keys as {@link mobileTheme}. */
export const darkTheme: AppTheme = {
  appearance: 'dark',
  colors: darkColors,
  ...shape,
  elevation: darkElevation,
}

/** Themes indexed by appearance. */
export const themes: Record<Appearance, AppTheme> = { light: mobileTheme, dark: darkTheme }

export type { Appearance }
