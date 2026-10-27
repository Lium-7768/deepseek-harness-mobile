# Client audit

A complete inventory of the native client and every defect the inventory
surfaced. Line counts and counts are taken from the tree at the commit that
added this file; re-derive them rather than trusting the numbers after large
changes.

## Method

1. Enumerate every route, component, module, endpoint, store, and token from
   the tree.
2. For each route, record which loading, empty, and error states it renders and
   what guards access.
3. Probe the classes of defect that a reading pass misses: touch-target sizes
   below the platform minimum, list virtualization, credential handling, log
   output, and hardcoded user-visible copy.
4. Fix what is safe to fix in one change and record the rest with its evidence.

## Routes

Fifteen route files. `_layout` owns the drawer navigator and the restore gate.

| Route | Lines | Purpose | Guard |
| --- | --- | --- | --- |
| `_layout.tsx` | 74 | Drawer navigator, query client, sync bridge, launch restore | blocks on `initialized` |
| `index.tsx` | 28 | Redirect to `/workspace` or `/connect` | reads `connection` |
| `connect.tsx` | 165 | Address + password sign-in, secondary QR entry | none |
| `connect/scan.tsx` | 175 | Camera pairing scan and redeem | none |
| `sessions.tsx` | 6 | Redirect to `/workspace`; kept for old links | none |
| `workspace.tsx` | 234 | Hero: workspace summary, session picker, composer | needs `connection` |
| `settings.tsx` | 791 | Settings sections, models, presets, device, connection | none; mutations need `connection` |
| `session/[sessionId].tsx` | 735 | Conversation, workbench tabs, composer, goals | needs `connection` + `sessionId` |
| `session/[sessionId]/interactions.tsx` | 511 | Pending approvals and questions | `sessionId` |
| `session/[sessionId]/mode.tsx` | 182 | Agent mode and permission selection | `sessionId` |
| `session/[sessionId]/model.tsx` | 151 | Model selection for the session | `sessionId` |
| `session/[sessionId]/permission.tsx` | 196 | Permission preset selection | `sessionId` |
| `session/[sessionId]/rename.tsx` | 121 | Rename a session | `sessionId` |
| `session/[sessionId]/subagent.tsx` | 183 | Child subagent conversation | `sessionId` + `parentSessionId` |
| `workspace/[workspaceId]/rename.tsx` | 110 | Rename a workspace | `workspaceId` |

## Components

Twenty files under `src/components`.

| Component | Lines | Responsibility |
| --- | --- | --- |
| `mobile-sync-bridge.tsx` | 339 | SSE subscription per session, reconnect backoff, cache patching |
| `session-drawer.tsx` | 814 | Drawer content: brand row, new session, search, workspace groups, footer |
| `workspace-shell.tsx` | 174 | Safe-area frame, header row, meta row, entrance fade |
| `workspace-composer.tsx` | 416 | Editor, attachments, tool row, send/stop, queue |
| `session-workbench.tsx` | 222 | Chat / trajectory / context tabs |
| `native-conversation-status.tsx` | 289 | Think disclosure, retry rows, separators, turn status |
| `native-agent-activity.tsx` | 280 | Jobs, subagents, objective input |
| `native-queue-dock.tsx` | 227 | Queued-turn editing and removal |
| `native-message-attachments.tsx` | 216 | Image and file attachments, save and share |
| `native-message-feedback.tsx` | 214 | Thumb up/down with optional note |
| `native-markdown.tsx` | 298 | Markdown projection: headings, lists, code, links |
| `native-tool-card.tsx` | 164 | Tool call card with state and output |
| `skeleton.tsx` | 159 | List, conversation, and block placeholders |
| `native-list.tsx` | 132 | Section and row primitives |
| `native-action-button.tsx` | 104 | Primary, secondary, and destructive actions |
| `native-model-selection.tsx` | 69 | Model row and description |
| `native-selection.tsx` | 53 | Radio row |
| `screen.tsx` | 32 | Plain screen frame |
| `native-brand-mark.tsx` | 18 | Wordmark |
| `native-icon.tsx` | 459 | Icon set mapped to SVG paths |

## Modules

Twenty-six non-component modules: `api/mobile-api.ts` (617), `types/mobile.ts`
(426), `shared/dsh-presentation.ts` (253), ten `*-logic.ts` helpers (1 258
total), three `state/` stores (85), three `theme/` modules (434), two `api/`
stores (84), and `locale/index.ts` for user-visible copy.

## Gateway surface

The App calls **38 endpoint patterns**. The desktop gateway on the `platform`
branch implements **39 routes** — 14 literal paths and 25 regular expressions —
so the two surfaces agree except for one addition:

| Endpoint | App | Gateway |
| --- | --- | --- |
| `/v1/auth` (address + password sign-in) | uses it | **missing** |
| everything else in `mobile-api.ts` | uses it | implemented |

Consequence: the Desktop plugin needs to add `/v1/auth` and nothing else on the
routing side.

## Theme tokens

`src/theme/index.ts` exports one shape set and two colour sets.

| Group | Members | Shared by both appearances |
| --- | --- | --- |
| `colors` | 40 roles: surfaces, labels, borders, brand, business, states, bubbles, code | no — each appearance has its own values |
| `radius` | `xs`, `card`, `control`, `bubble`, `composer`, `sheet`, `pill` | yes |
| `spacing` | `xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `xxl` | yes |
| `typography` | `eyebrow`, `caption`, `body`, `bodyLarge`, `message`, `title`, `lineBody`, `lineMessage` | yes |
| `chrome` | header, meta row, tabs, composer radius, control height | yes |
| `touch` | icon button, compact icon button, control height, minimum target | yes |
| `elevation` | card and sheet shadows | no — a dark surface needs a different shadow |

Values come from the desktop design system; `docs/MOBILE-PARITY.md` records each
role's source token and the resolved value for both appearances. Screens read
them through `useAppTheme()` and `useThemedStyles()`; importing `mobileTheme`
directly freezes the light palette and is only correct for shape tokens.

## State

| Store | Persistence | Holds |
| --- | --- | --- |
| `state/connection.ts` | SecureStore (`connection-store.ts`) | gateway URL, device id, access token |
| `state/session-selection.ts` | SecureStore (`session-selection-store.ts`) | last session and workspace per gateway |
| `state/mobile-sync.ts` | memory | live subscription ids per session |

Credentials live in the Keychain through `expo-secure-store`; nothing writes a
token to AsyncStorage or to a log.

## Per-screen states

`loading` counts indicators or skeletons, `error` counts error surfaces, `empty`
counts empty-state copy.

| Route | loading | error | empty |
| --- | --- | --- | --- |
| `connect` | 0 | 7 | 0 |
| `connect/scan` | 3 | 7 | 0 |
| `workspace` | 0 (status line) | 4 | 5 |
| `settings` | 2 | 23 | 8 |
| `session/[sessionId]` | 2 | 19 | 18 |
| `session/…/interactions` | 2 | 9 | 4 |
| `session/…/mode` | 0 | 13 | 2 |
| `session/…/model` | 0 | 9 | 2 |
| `session/…/permission` | 0 | 10 | 3 |
| `session/…/rename` | 0 | 1 (Alert) | 2 |
| `session/…/subagent` | 0 | 9 | 1 |
| `workspace/…/rename` | 0 | 1 (Alert) | 1 |

`workspace` reports load and failure through `workspaceDetail()`, which renders
one status line under the header rather than a placeholder in the body; the
screen is a composer surface, not a list.

## Keyboard

Every screen that renders a `TextInput` wraps its body in `KeyboardAvoidingView`
with iOS `padding` behaviour and an offset equal to the shell header height, so
the caret stays above the keyboard instead of under it. Android uses `height`.

| Screen | Offset source |
| --- | --- |
| `connect` | `workspaceKeyboardVerticalOffset(insets.top, false)` |
| `workspace` | `workspaceKeyboardVerticalOffset(insets.top, true)` — has the meta row |
| `session/[sessionId]` | `workspaceKeyboardVerticalOffset(insets.top, false)` |
| `session/[sessionId]/interactions` | `workspaceKeyboardVerticalOffset(insets.top, false)` |
| `session/[sessionId]/rename` | same, wrapping the canvas |
| `workspace/[workspaceId]/rename` | same, wrapping the canvas |

Scrollable surfaces use `keyboardDismissMode="on-drag"` and
`keyboardShouldPersistTaps="handled"` so a tap on a row reaches the row instead
of only dismissing the keyboard. Inputs inside the composer, the drawer, the
queue dock, and the agent-activity editor inherit the avoidance of the screen
that renders them.

## Reconnect

`MobileSyncBridge` holds one SSE subscription per visible session.

| Concern | Behaviour |
| --- | --- |
| Backoff | `1s → 2s → 5s → 10s`, then held at 10s |
| Gate | retries only while `AppState` is `active`; a background app does not poll |
| Resumption | re-reads the last `since` sequence from the query cache and resumes from it |
| Re-pair | a `401`/`403` on the stream raises `requiresRePair`, which routes the user back to `connect` instead of retrying a dead credential |
| Cache | a changed connection scope clears the query client, so a second desktop never sees the first one's sessions |

## Findings

| ID | Severity | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| F1 | High | 928 user-visible Chinese strings across 32 files: 575 string literals plus 353 JSX text nodes. Adding a second language would mean touching every screen. | counted by scanning literals and JSX text outside comments | **In progress** — 274 migrated across 8 files; 654 remain in 25 files |
| F2 | High | The App signs in through `/v1/auth`, which no desktop gateway serves. | endpoint set above | **Open** — Desktop plugin work |
| F3 | Medium | The Think disclosure and retry rows were 24pt with no hit slop, so the touch target was 24pt. | `native-conversation-status.tsx` | **Fixed** — `hitSlop={10}` restores 44pt |
| F4 | Medium | The attachment remove button was 20pt with 6pt slop: a 32pt target. | `workspace-composer.tsx` | **Fixed** — slop raised to 12pt |
| F5 | Medium | The conversation list mounted every row on first paint. | `FlatList` had no windowing props | **Fixed** — `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `updateCellsBatchingPeriod` |
| F6 | Medium | A rejected password could reach the device log if the gateway echoed it in a fault message. | `createError` reports `rawMessage` by default | **Fixed** — the auth path reports nothing |
| F7 | Low | `sessions.tsx` is a 5-line redirect kept only for old deep links. | file content | **Open** — removal would break a previously published URL |
| F8 | Low | Control heights are fixed while text scaling is on, so a large Dynamic Type setting can clip labels. | no `maxFontSizeMultiplier` anywhere | **Open** — needs a pass over every control |
| F9 | Low | `keyExtractor` falls back to the row index for rows without `rowKey`. | `session/[sessionId].tsx` | **Accepted** — reruns rebuild the whole list anyway |
| F10 | Info | The desktop device registry is an in-memory `Map`, so a restart forgets every paired device. | `device-registry.ts` on `platform` | **Open** — Desktop plugin work |
| F11 | Low | The goal editor's cancel and save buttons set `disabled` but never exposed it as `accessibilityState`, so a screen reader announced them as available. | `native-agent-activity.tsx` | **Fixed** — state added |
| F12 | Medium | Both rename screens rendered a `TextInput` with `autoFocus` and no keyboard avoidance; the canvas used a `paddingTop` guess instead. | `session/…/rename.tsx`, `workspace/…/rename.tsx` | **Fixed** — wrapped in `KeyboardAvoidingView` |

## What was changed

- `native-conversation-status.tsx`: `hitSlop` on both disclosure rows.
- `workspace-composer.tsx`: attachment remove slop 6 → 12.
- `session/[sessionId].tsx`: list windowing.
- `mobile-api.ts`: the auth path suppresses diagnostics.
- `native-agent-activity.tsx`: the goal editor's two buttons expose `disabled`.
- Both rename screens: `KeyboardAvoidingView` replaces the `paddingTop` guess.

## What is left, in priority order

1. **Desktop plugin** (F2, F10): the only thing between the App and a working
   public connection.
2. **Locale migration** (F1): done — the API client's 24 failure messages, the
   drawer's session rows and date formatting, the statistics line, the
   conversation fallback labels, the trajectory titles and action names, the
   sign-in screen, and the shared a11y suffixes.
   Remaining, by copy volume: `settings.tsx` (105), `session/[sessionId].tsx`
   (74), `session-drawer.tsx` (73), `workspace-composer.tsx` (41),
   `session/…/interactions.tsx` (34), `session/…/permission.tsx` (30),
   `session-composer-logic.ts` (28), `workspace.tsx` (27), then 17 smaller
   files. Fall back to `format()` when a message carries values.
3. **Dynamic Type** (F8): replace fixed control heights with minimums and add
   `maxFontSizeMultiplier` where a label must not wrap.

## Verification

- `pnpm typecheck` — clean.
- `pnpm test` — 88 passing across 16 files, including the theme and locale contracts.
- `npx expo export --platform ios` — bundles.
- Simulator pass on iPhone 16 Pro: connect screen (light and dark, before and
after the locale migration), settings (dark), drawer (light and dark).
