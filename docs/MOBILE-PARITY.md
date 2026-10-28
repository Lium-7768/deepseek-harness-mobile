# Mobile parity with DSH Pocket

The native client reproduces the layout and interaction decisions of
[`dsh-pocket`](https://github.com/shaobeichen/dsh-pocket)'s mobile adaptation.
That adaptation is a stylesheet over the desktop DOM, so it states the intent
for a phone explicitly; this document records the extracted values and where
each one lives in the native client.

Source: `client/mobile/mobile.css.ts` (1031 lines) and the four mobile
components in the installed `dsh-pocket` package. Line references below point
at that file.

## Scope

Only the phone-chrome rules apply to a native client. Three groups of rules in
the source have no counterpart here and are deliberately not ported:

- **Third-party web polish** (lines ~700-1000): `dsh-usage-stats`,
  `dsh-web-ui` explorer sheet, floating pet, conversation stats line. Those
  style plugins that have no native presence.
- **Desktop-DOM workarounds**: grid track repair, `scrollbar-gutter`, the
  competitor `::after` mask, drag handles, Safari input-zoom guard. React
  Native has no grid, no scrollbar gutter, and no double-tap zoom.
- **DOM selector targeting** (`:has()`, `[class$="_scroll"]`). The native
  client owns its own components, so a rule becomes a style value.

## Phone chrome

| Concern | DSH Pocket | Native |
| --- | --- | --- |
| Status-bar clearance | frame `padding-top: env(safe-area-inset-top)` (line ~190) | `useSafeAreaInsets().top` on the shell |
| Drawer geometry | `position: absolute; inset: 0 auto 0 0; width: max-content; max-width: 92vw` (line ~230) | `drawerWidthForViewport()` — `min(360, 92% of viewport)` |
| Drawer motion | `transform: translateX(-110%)` → `none`, `transition: transform .28s ease-in-out` (line ~230) | `react-native-drawer-layout` slide, default duration |
| Drawer elevation | none — "the dimmed backdrop already separates drawer from content" | no shadow |
| Drawer top inset | `padding-top: env(safe-area-inset-top)` (line ~240) | `paddingTop: insets.top` on drawer content |
| Drawer edge | `border-right: none` (line ~250) | no right border |
| Backdrop | `rgba(0, 0, 0, .45)`, `fade .2s` (line ~120) | `theme.colors.scrim` = `rgba(0,0,0,0.45)` |
| Backdrop input | `pointer-events: none`; outside-tap closes in JS | drawer overlay press closes |

## Header

| Concern | DSH Pocket | Native |
| --- | --- | --- |
| Header padding | `padding: 8px 12px 0` (line ~410) | `paddingTop 8`, `paddingHorizontal 12` |
| Header row height | `min-height: 36px` (line ~415) | `minHeight: 36` |
| Header row insets | `padding: 0 32px` (line ~415) | `paddingHorizontal: 32` |
| Title max width | `max-width: calc(100vw - 104px)` (line ~425) | `maxWidth: viewport - 104` |
| Drawer toggle | `28×28`, absolute `left: 8; top: 12`, radius 50% (lines 17-40, 430) | `IconButton size 28`, absolute `left 8 / top 12` |
| Files toggle | `28×28`, absolute `right: 8; top: 12` (or `right: 44` with the right bar) (line ~440) | `IconButton size 28`, absolute `right 8` |
| Control glyph | 16px | `NativeIcon size 16` |

## Headerless screens — not ported

Pocket adds a floating fallback control (`fab`, line 88) because the Web hero
and blank phases render no session header, so the drawer would be unreachable.

Every native screen wraps `WorkspaceShell` with a title and a menu action, so
the drawer is always reachable and there is no state that needs a fallback
control. Adding one would create a second way to open the same drawer. The
`fab` rule is therefore intentionally absent rather than unfinished.

## Conversation

| Concern | DSH Pocket | Native |
| --- | --- | --- |
| Column gutters | `padding-left/right: 20px` (line ~370) | `paddingHorizontal: 20` |
| Body type | `font-size: 15px` for paragraphs, list items, and user text (line ~380) | `fontSize: 15`, `lineHeight: 22` |
| User bubble type | covered by the same 15px rule | `fontSize: 15`, `lineHeight: 22` |
| Consecutive process rows | `[data-turn-process] height 28px`, `padding-bottom 4px`, `margin-bottom 4px` (line ~395) | `minHeight 28`, `lineHeight 24`, `paddingBottom 4`, `marginBottom 4`; a minimum, so Dynamic Type grows the row instead of clipping |
| Disclosure rows | `min-height: 24px` (line ~400) | `minHeight: 24` |
| Context injection block | `margin-top: 2px` (line ~405) | `marginTop: 2` |
| Message action strip | `_actions { overflow: hidden }`, `_timeEnd` truncates with an ellipsis (line ~410) | row with `overflow: 'hidden'`; the clock is `numberOfLines={1}` with `ellipsizeMode="tail"` and `flexShrink: 1` |

## Composer

| Concern | DSH Pocket | Native |
| --- | --- | --- |
| Empty state | hero textarea collapses to one 28px line via `textarea:placeholder-shown { height: 28px }` (line ~700) | multiline input with a `minHeight: 28` single-line floor; it grows with content |
| Row floor | cleared by the send control | `minHeight: theme.touch.minTarget` (44) |
| Bottom row wrap | `flex-wrap: wrap; gap: 6px` (line ~430) | `flexWrap: 'wrap'`, `gap: 6` |
| Leading control group | `gap: 8px; min-width: 0` | row `gap: 8`, field `minWidth: 0` so it shrinks instead of pushing a control out of the card |

## Session rows and grouping

| Concern | DSH Pocket / desktop | Native |
| --- | --- | --- |
| Row height | 32 (`Rows.module.css:118`) | `minHeight: 32`, with 6pt vertical hit slop reaching the 44pt iOS target |
| Row radius | `--dsw-radius-md` = 12 (`:6`) | `radius.md` |
| Row padding | `0 8px` (`:7`) | `paddingHorizontal: 8` |
| Row gap | `0` (`:120`) | none |
| Title | `font-size 14`, `line-height 20`, margins `0 6 0 4` (`:123,176`) | `fontSize 14`, `lineHeight 20`, `marginLeft 4`, `marginRight 6` |
| Time / meta | `font-size 10`, `line-height 16`, `flex: none` (`:233`) | `fontSize 10`, `lineHeight 16`, `flexShrink: 0` |
| Menu row | radius-md, `min-height 36`, `padding 7px 8px`, gap 8, `margin 0 2px` (`SidebarRoot.module.css:532`) | the same values, with 4pt hit slop |
| Separator | `--dsw-alias-border-l3` = 0.12 | `theme.colors.border` = the same value |

## Session rows and grouping — earlier notes

Pocket does not restyle the sidebar's session rows. Its own note says the
drawer "list keeps its size" while only conversation text shrinks, and the
stylesheet carries no rule for a session row, a workspace group, or a group
header. The native drawer therefore keeps `NativeListRow` (44pt minimum,
10pt radius, 1pt border) and the existing workspace grouping logic.

Two consequences are worth recording:

- Row height stays at the platform touch floor rather than a Web row height.
  Pocket's rows inherit the desktop sidebar's own sizing, which is not a phone
  measurement to copy.
- The user message bubble is correct as it stands: DSH's design system defines
  `--dsw-specific-bubble`, which resolves to `rgb(237,243,254)` in light and
  `rgb(44,44,46)` in dark — the values the native palette already uses.

## Drawer footer

Pocket moves the session actions out of the header into a footer pinned to the
bottom of the drawer, beside Settings, and draws each as a bordered pill.

| Concern | DSH Pocket | Native |
| --- | --- | --- |
| Bar placement | pinned to the drawer bottom | `position: 'absolute'`, `bottom: 0`, drawer fill |
| Bar padding | `padding: 10px` | `padding: 10` |
| Action control | `height: 34px; padding: 0 12px; border: 1px solid border-l1; border-radius: 12px` (line ~60) | `minHeight 44` (platform touch floor), `paddingHorizontal 12`, 1px `border`, `radius 12` |
| Action glyph | 14px | `NativeIcon size 14` |
| Action label | `font-size: 13px; line-height: 20px` | `fontSize 13` |
| Action gap | `gap: 8px` | `gap: 8` |
| Content clearance | — | `paddingBottom: 64` = 10 + 44 + 10 |

### Actions the native contract cannot serve

Pocket's footer holds two actions that the native client has no counterpart for;
both are contract gaps rather than missing UI:

- **Files** opens the `dsh-web-ui` explorer, a Web plugin. The mobile gateway
  exposes no file routes, and this client's contract keeps desktop files on the
  desktop.
- **Session log** calls the Web client's `sessionLogDownload` controller. The
  gateway's `/v1/...` surface has no export route.

Both stay out until the gateway grows the corresponding routes; a button that
cannot do its job is worse than an absent one.

## Transient surfaces

| Concern | DSH Pocket | Native |
| --- | --- | --- |
| Popup placement | snap to a viewport-anchored bottom sheet: `left/right 12px; bottom: calc(env(safe-area-inset-bottom) + 12px); max-height: min(65vh, 480px)` (line ~395) | modal route, bottom presentation |
| Sheet radius | `14px` (line ~400) | `theme.radius.sheet` = `14` |
| Sheet shadow | `0 -4px 28px rgba(0, 0, 0, .18)` | same |
| Sheet entrance | `sheet-in .22s`: `translateY(14px) scale(.98)` → none (line ~140) | the shell's 180ms opacity entrance |
| Backdrop fade | `fade .2s` | same duration |
| Reduced motion | animations disabled under `prefers-reduced-motion` (line ~500) | `useReducedMotion()` skips every entrance |

### Where the native client keeps the Web client's desktop layout

Two Pocket rules depend on the Web client's DOM structure and have no native
counterpart, so the native client keeps its own arrangement:

- **Composer popups as sheets.** Pocket re-anchors the model menu and the `/`
  palette to the viewport because they are absolutely positioned inside
  `overflow: hidden` scroll containers. Native routes already render as their
  own screen, so nothing clips them.
- **Absolute header controls.** Pocket positions the toggle and files buttons
  absolutely to escape the header's flex lanes. The native header lays them out
  in the row itself, which cannot overflow.

## Motion

Durations and easing come from the desktop's tokens in
`ui-theme/src/styles/base.css:15-18`:

| Token | Desktop | Native |
| --- | --- | --- |
| fast | `0.1s` | `theme.motion.fast` = 100 |
| default | `0.2s` | `theme.motion.base` = 200 |
| slow | `0.3s` | `theme.motion.slow` = 300 |
| easing | `--ds-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)` | `useMotionEasing()` |

The easing stays as control points in the token module and becomes an RN easing
function in `hooks`, because `theme/index.ts` must not import react-native: the
logic tests read it in a Node process. A screen entrance used 180ms with
`Easing.out(Easing.quad)`; it now uses the default duration and the desktop curve,
so a route change accelerates the way the Web and desktop clients do.

## Type scale

Sizes and line heights follow the desktop's scale in
`ui-theme/src/styles/gradient-shadow-text.css`:

| Step | Size | Line height |
| --- | --- | --- |
| `xxxs` | 11 | 14 |
| `xxs` | 12 | 18 |
| `xs` | 13 | 20 |
| `s` | 14 | 22 |
| `base` | 16 | 24 |
| `l` | 20 | 28 |
| `xl` | 24 | 32 |

Off-scale values that had crept in (line heights 19, 21, 23; a 22px title) now
resolve to 20, 22, and the `l` step.

One deliberate departure: the conversation body stays at 15 with a 22 line
height. The desktop leaves that text at a configurable 13px
(`--dsh-content-font-size-secondary`), sized for a desk monitor; a phone held at
arm's length needs the platform's body size, and 13 would read as fine print.

## Colour roles

Every colour resolves through a theme role; no screen holds a literal value. A
literal cannot follow the appearance, so a dark surface would keep the light one.
`tests/theme-token-discipline.spec.ts` fails the suite if one reappears.

Interaction tints come from the desktop's own translucent tokens rather than a
solid fill or an opacity change, which do not composite the same way:

| State | Desktop | Native |
| --- | --- | --- |
| Selected row | `interactive-bg-hover` (`Rows.module.css:21`) | `theme.colors.interactiveHover` |
| Held row | `interactive-bg-active` | `theme.colors.interactiveActive` |
| Keyboard focus | 2px `state-business-primary` ring (`focus.css:3,9`) | `outlineWidth: 2` with `theme.colors.accent`, drawn outside the border box |
| Floating control | `button-floating-fill` / `-hover` (`ChatView.module.css:422`) | `theme.colors.floating` / `floatingHover` on the return-to-latest pill |

Media overlays — the full-screen viewer, the busy veil, the camera viewfinder,
and controls drawn on a photo — are the one group with the same value in both
appearances, because they sit on an image rather than on a surface. They are
still roles (`overlayMedia`, `overlayBusy`, `scrimCamera`, `controlOnMedia`,
`borderOnMedia`) so the value is declared once.

## Icons

The client renders the desktop client's own glyphs rather than a parallel
lookalike set. `src/components/icon-artwork.ts` copies the artwork from
`packages/client/ui-primitives/src/icons/artwork.ts`, and `NativeIcon` renders
that SVG unchanged, substituting the colour for `currentColor`. Geometry and
stroke therefore cannot drift between the two clients.

| | Desktop | This client |
| --- | --- | --- |
| Artwork | `artwork.ts`, 16px box, stroke-based | copied from the same file |
| Names | `<glyph>-outline`, plus `-fill` and plain forms | the same names |
| Weights | `regular` 1px, `medium` 1.3px | both, via `weight` |
| Rendering | `<symbol>` in a document sprite | `SvgXml` per icon |

Glyphs that exist only here:

- `link-off` — the desktop set has no broken-link glyph, and this client shows
  one for a disconnected gateway. It is drawn to the same 16px box and 1px
  stroke as the copied artwork.

A desktop glyph whose meaning differed was mapped onto the nearest one that
matched: `admin-panel-settings` → `shield-outline`, `smart-toy` →
`agent-preset-outline`, `terminal` → `code-outline`, and the hamburger `menu` →
`panel-left-outline`, which is what the desktop itself uses to open the drawer.

## Surfaces outside the comparison

`MOBILE_CSS` holds 57 top-level rule blocks. Twenty-three are the chrome this
client renders and are covered above. The rest target dsh-pocket's own Web
plugins, which this client does not implement, so there is nothing to compare
against. They are listed here so a later reader does not mistake them for
missed work:

| Block group | Selectors | Why there is no counterpart |
| --- | --- | --- |
| File explorer | `[data-mobile-nav="explorer"]`, `[data-aionui-explorer-col]` and its 8 child rules | Pocket opens the `dsh-web-ui` explorer panel; the mobile gateway exposes no file routes |
| Overlay panels | `[data-aionui-preview-col]`, `.aionui-preview-handle`, `.aionui-floating-expand`, `[data-mobile-nav="frame"][data-aionui-*-open]` | Preview and explorer columns are Web plugin chrome |
| Task board | `[data-dsh-taskboard-board]` columns and header search | No task-board feature in this client |
| SSH entry | `button[data-dsh-ssh-entry]` | No SSH surface in this client |
| Usage stats | `[class*="usg_"]` stats row and stat tiles, `[data-mobile-nav="stats"]` | Token usage renders inline in the conversation, not as a stats panel |
| Copy file | `[data-mobile-nav="copy-file"]` and its disabled state | No file surface to copy from |
| Modal internals | `[aria-modal="true"]` tabs, search, nav cells, sections, cube rows | This client has no modal with those internals; its sheets are native views |
| Workspace add | `button[aria-label="Add workspace…"]` | Workspaces are created on the desktop |
| Right-bar toggle | `body[data-dsh-pocket-mobile-rightbar="off"] [data-conversation-header-corner]` | No right bar in this client |
| Rich text editing | `[contenteditable="true"]` | The composer is a plain `TextInput` |
| Keyframes | `from`, `to` | Part of the drawer transition, covered above |
| Drag handle | `[data-side="details"]` | Desk-side panel sizing, absent natively |

A reader who adds one of those features should compare its rules against
`dsh-pocket/client/mobile/mobile.css.ts` at that time; the table records scope,
not a promise that the feature stays out.

## Verification

- `pnpm typecheck` — the whole client compiles.
- `pnpm test` — the logic and theme contracts, including the appearance tests.
- `npx expo export --platform ios` — the app bundles for a device.
