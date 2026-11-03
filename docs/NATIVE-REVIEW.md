# Native client review

This review covers the mobile repository, covering the current implementation. The desktop repository is a read-only design and protocol reference. Desktop application downloads, installation and updater surfaces are excluded.

## Desktop design references

The reference is the actual source under `deepseek-harness/packages/client/`, rather than an unrelated design system:

| Surface | Desktop source | Native adaptation |
| --- | --- | --- |
| Colour roles and radii | `ui-theme/src/styles/design-platform.css`, `base.css` | Existing light/dark semantic roles, 28pt composer, 20pt sheet shell; corrected dark caption tone |
| Hero and input | `ui-conversation/src/client/skeleton/InputBar.module.css` | A centered hero/input group with a 760pt maximum; flexible model label and fixed send control |
| Conversation | `ui-chat/src/client/chat/ChatView.module.css` | Folded completed turns, neutral assistant surface, pale user bubble, 20pt phone gutters and 15/24 prose |
| Sidebar | `ui-sidebar/src/client/SidebarRoot.module.css` | Native drawer, compact rows, neutral fill, 44pt new-session action |
| Settings | `ui-settings-general/src/client/GeneralSection.module.css` | Section rows and native choice sheets; local appearance works even with a read-only desktop |
| Menus | Shared desktop menu surfaces | One safe-area-aware sheet family with bounded height, keyboard clearance, dismiss/back support and native accessibility |

Native decisions intentionally retained: safe areas, native drawer/back navigation, keyboard avoidance, a dedicated send button with Return inserting a newline, minimum touch areas, system sharing, Dynamic Type and reduced motion. Placeholder text describes actions the phone actually supports; it does not advertise a full file explorer or slash-command palette.

## Structure after the changes

```text
app/                 Expo Router entries; root cache and navigation providers
src/features/        connection, workspace, session, interactions, subagent, settings screens
  session/           screen + query hook + command hook
src/api/             typed gateway client, deadline/cancellation, query keys/client, credential persistence
src/sync/            foreground stream runtime, SSE parsing, cache updates, history window
src/hooks/           native foreground/focus adapters
src/components/      reusable native presentation, conversation rows, pickers and settings sections
src/state/           small UI stores: connection, selection, appearance, transport, temporary drafts
src/theme/           semantic palettes, shared metrics and platform-specific typography
src/shared/          local presentation contract; no runtime dependency on the desktop repo
tests/               portable behavior regressions
scripts/visual/      loopback-only gateway with synthetic data for repeatable UI checks
```

Feature screens import shared UI and API modules. The SSE runtime and query projection no longer import React or React Native. File routes do not own network or rendering logic. Pure merge logic no longer lives in a component module. TypeScript rejects unused imports/parameters, and Prettier plus CI check formatting.

## Reliability changes

- Ordinary requests time out after 30 seconds, including response decoding. Queries consume cancellation signals. Commands never retry automatically; ambiguous send failures do not offer an immediate duplicate-send button.
- SecureStore restore failures exit the spinner into a retry/reconnect surface.
- A different gateway/device identity mounts a new QueryClient. Old transport generations abort outstanding HTTP/stream work and cannot update the new desktop's cache.
- SSE reports connected after `gateway/ready`, backs off 1/2/5/10 seconds, detects a missing handshake after 15 seconds, and detects an idle transport after 45 seconds. Comment heartbeats count as activity. CRLF frames and split chunk boundaries are accepted.
- Subagent transcript polling only runs while its route is focused and the application is active. Reconnect invalidates child transcript caches.
- Settled assistant messages replace their deltas. The live tail drops complete old turns around 2,000 events; explicitly loaded older history remains available. A single open turn is never cut in half, so this is a soft event bound, not an absolute byte limit. History pagination remains desktop-owned.
- Removed duplicate page-local accumulation of all SSE events. Turn duration lookup is linear instead of repeatedly scanning history; settled span lookup uses binary search.
- Central query keys fix the previous `sessions`/`session-list` invalidation mismatch. Native foreground changes are connected to React Query's focus manager.
- Unsent text survives route switches in a bounded in-memory store and is cleared when leaving the paired desktop. Image drafts remain local to their composer; nothing is persisted as a second session database.

## Native practices addressed

- Android code uses its system monospace face instead of the unavailable Menlo font.
- Settings returns to the originating screen, preset detail has a working back control, and radio rows expose checked state.
- Search inputs can grow for larger text; menus have safe-area and keyboard bounds.
- Appearance tests exercise production logic. The previous test reading a private `/tmp` session was replaced with a small portable synthetic exchange.
- Expo/RN packages use the recommended compatible SDK 57 patch versions. The Swift 6.2 compatibility patch now targets `expo-modules-jsi@57.1.3`; upstream already fixed the old C++ constructor issue, so that hunk is removed.

## Verification

Verification results and any native build or visual limits are recorded in `IMPROVEMENT-PLAN.md`. The synthetic visual fixture does not verify connectivity to a production desktop or execute a real model task.

Push notifications and Gateway-side idempotent message submission require separate desktop/server contracts and are not silently introduced by a mobile UI change.

The dependency audit was also run: compatible transitive patches removed the critical finding and 20 other advisories. Four Expo CLI/config advisories remain and are recorded as A7 in the task ledger; the audit CI gate remains enabled.

## Conversation behavior

The synthetic validation covers multi-Turn conversation flow and all expanded tool/reasoning states using synthetic fixture sessions `conversation-full`, `conversation-failure`, and `conversation-running`. the Turn is now the unit for completion actions and process disclosure, nested tool rows no longer pull negative margins, and Markdown has explicit block spacing plus desktop-coloured syntax highlighting. Native horizontal code scrolling preserves source formatting on narrow screens.

## Narrow screens and enlarged text

The deeper pass exercised a 320pt viewport with 150% font scaling. Effective reading width now selects compact composer chrome, stacked settings/actions and stacked model/provider rows. Sheets measure their own viewport and keyboard overlap, own one elevation and let content scroll. Dismissal uses a backdrop tap, Android Back or accessibility escape; there is no visible close toolbar. Search results take precedence over model-picker chrome while searching. The implementation and acceptance document lists the validated matrix and remaining behavior gaps.
