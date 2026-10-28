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
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, panel: 28, card: 12, control: 8, bubble: 12, composer: 20, sheet: 16, pill: 999 },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  // Sizes and line heights come from the desktop's type scale
  // (ui-theme/styles/gradient-shadow-text.css): 11/14, 12/18, 13/20, 14/22,
  // 16/24, 20/28, 24/32. The conversation body is the one deliberate departure:
  // the desktop leaves it at a configurable 13px for a desk monitor, while a
  // phone read at arm's length needs the platform's body size.
  typography: { eyebrow: 11, caption: 12, body: 14, bodyLarge: 15, message: 15, title: 20, lineBody: 22, lineTitle: 28, lineMessage: 22 },
  rail: { width: 56, button: 36, gap: 12 },
  chrome: {
    headerHeight: 36,
    headerMetaHeight: 35,
    headerWithMetaHeight: 71,
    tabHeight: 35,
    composerRadius: 20,
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
  /** Metadata and placeholder text. */
  inkFaint: string
  /** Standard divider. */
  border: string
  /** Emphasised divider and control outline. */
  borderStrong: string
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
  /** Text and glyphs drawn on `brand`. */
  onBrand: string
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
  /** Code block text. */
  codeForeground: string
  /** Interactive code span. */
  codeInteractive: string
  /** Code block language label. */
  codeLabel: string
  /** Success-coloured code text, including diff additions. */
  codeSuccess: string
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
  background: 'rgb(255, 255, 255)',
  canvas: 'rgb(255, 255, 255)',
  drawerBackground: 'rgb(245, 246, 247)',
  surface: 'rgb(255, 255, 255)',
  surfaceRaised: 'rgb(255, 255, 255)',
  floating: 'rgb(255, 255, 255)',
  floatingHover: 'rgb(241, 243, 245)',
  surfaceMuted: 'rgb(245, 246, 247)',
  surfaceActive: 'rgb(235, 238, 242)',
  ink: 'rgb(15, 17, 21)',
  inkMuted: 'rgb(97, 102, 107)',
  inkFaint: 'rgb(173, 178, 184)',
  border: 'rgba(0, 0, 0, 0.12)',
  borderStrong: 'rgba(0, 0, 0, 0.16)',
  borderHairline: 'rgba(0, 0, 0, 0.04)',
  accent: 'rgb(65, 118, 230)',
  textOnAccent: 'rgb(255, 255, 255)',
  accentText: 'rgb(30, 64, 175)',
  accentSoft: 'rgb(228, 237, 253)',
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
  onBrand: 'rgb(255, 255, 255)',
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
  scrim: 'rgba(0, 0, 0, 0.45)',
  onScrim: 'rgb(255, 255, 255)',
  skeleton: 'rgba(0, 0, 0, 0.04)',
  codeBackground: 'rgb(27, 27, 28)',
  codeForeground: 'rgb(228, 234, 243)',
  codeInteractive: 'rgb(191, 219, 254)',
  codeLabel: 'rgb(147, 197, 253)',
  codeSuccess: 'rgb(134, 239, 172)',
}

const darkColors: ThemeColors = {
  background: 'rgb(21, 21, 23)',
  canvas: 'rgb(21, 21, 23)',
  drawerBackground: 'rgb(35, 35, 36)',
  surface: 'rgb(21, 21, 23)',
  surfaceRaised: 'rgb(44, 44, 46)',
  floating: 'rgb(44, 44, 46)',
  floatingHover: 'rgb(53, 54, 56)',
  surfaceMuted: 'rgb(53, 54, 56)',
  surfaceActive: 'rgb(67, 69, 74)',
  ink: 'rgb(249, 250, 251)',
  inkMuted: 'rgb(207, 211, 214)',
  inkFaint: 'rgb(173, 178, 184)',
  border: 'rgba(255, 255, 255, 0.16)',
  borderStrong: 'rgba(255, 255, 255, 0.2)',
  borderHairline: 'rgba(255, 255, 255, 0.06)',
  accent: 'rgb(122, 170, 255)',
  textOnAccent: 'rgb(21, 21, 23)',
  accentText: 'rgb(147, 197, 253)',
  accentSoft: 'rgba(122, 170, 255, 0.16)',
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
  onBrand: 'rgb(21, 21, 23)',
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
  scrim: 'rgba(0, 0, 0, 0.45)',
  onScrim: 'rgb(255, 255, 255)',
  skeleton: 'rgba(255, 255, 255, 0.08)',
  codeBackground: 'rgb(27, 27, 28)',
  codeForeground: 'rgb(228, 234, 243)',
  codeInteractive: 'rgb(191, 219, 254)',
  codeLabel: 'rgb(147, 197, 253)',
  codeSuccess: 'rgb(134, 239, 172)',
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
