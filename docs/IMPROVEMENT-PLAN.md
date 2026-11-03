# Mobile implementation and acceptance

The native client follows the desktop source in `/Users/meiyu/code/deepseek/deepseek-harness`. Safe areas, native navigation, keyboard avoidance, touch targets, Dynamic Type and reduced motion remain native adaptations. Desktop downloads, installation and updates are outside scope.

## Implemented behavior

| IDs       | Area                           | Current behavior                                                                                                                                                            |
| --------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1–R6     | Transport and lifecycle        | Request deadlines/cancellation, recoverable credential restore, scoped query cache, SSE handshake/backoff/idle detection, foreground refresh, bounded history and drafts    |
| U1–U3     | Native surfaces                | Shared desktop palette/type/icons across workspace, conversation, drawer, settings, interactions and subagents                                                              |
| A1–A6, A8 | Structure and native practices | Thin file routes, feature/query/action modules, pure logic helpers, unused-code checks, formatting, native monospace, keyboard offsets and local appearance                 |
| C1–C4     | Conversation                   | Turn-owned completion actions, expandable tool/reasoning flow, stable disclosure state, diff/code/table rendering and horizontal code scrolling                             |
| D1–D4     | Layout and interaction         | Compact controls and stacked fields for enlarged text; bounded keyboard-aware sheets; safe rename/archive interactions and native accessibility                             |
| G1–G3     | Goal dock                      | Compact single-line goal before queue and input; live activation determines pause/resume; edit/create/clear use desktop APIs and CAS; pending guard and recoverable editing |
| B1        | Drawer view menu               | Floating card anchored below its trigger; workspace/workspace-tree/flat, manual/recent sorting, all three archived filters; fixed header/footer                             |
| B2        | Drawer search                  | In-header input; immediate title/workspace/id matches; debounced cancellable history search; deduplicated results with workspace/snippet, skeleton/error/empty states       |
| B3        | Manual order                   | Per-desktop client preferences persist across restarts; native row-menu move controls preserve hidden members and workspace boundaries                                      |
| I1        | Icon parity                    | Shared SVG geometry, sizes and regular/medium weights match a portable desktop-reference fixture; only `link-off` and `arrow-up` are native-only                            |
| N1        | Android system UI              | System CA trust only; navigation icons follow the app appearance, including native overlay windows; LAN HTTP compatibility is documented accurately                         |

## Completed review fixes

| IDs             | Acceptance                                                                                                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1–P0-4, P0-6 | One selection controller serves hero and conversation: destructive full-access confirmation, no-op current choices, published-option validation, known-idle event guard, confirmation-time identity/status recheck, immediate serialization and visible pending state |
| P0-5            | Model picker preserves catalog loading, fetch failures, routing unavailable and provider failures. Route lookup uses provider plus model id; trigger labels match picker labels.                                                                                      |
| B4              | Archived rows expose restore through the new narrow Gateway unarchive route; list and search share archive visibility.                                                                                                                                                |
| B5              | Plugin, automation and More drawer entries are wired. Automation catalog supports pause/resume/delete with version checks; a desktop-style animated ring respects reduced motion.                                                                                     |
| P1/P2           | Modal owns one surface/elevation; no redundant close toolbar; keyboard geometry uses lengths within the same Modal; unused route helpers/styles and stale comments removed; settings accessibility copy uses locale.                                                  |

## Remaining limits

The dependency audit reports four advisories in Expo CLI/config dependencies. Patched versions require incompatible major upgrades for zod/glob/minimatch; deepmerge has no patched release. These are reported as an external toolchain limitation, not hidden by the audit gate. No incompatible overrides are forced. Production desktop deployment and physical-device/iOS interaction checks remain outside this validation.

## Goal integration

The desktop's durable `goal` projection supplies identity, revision, objective and phase. Process-local activation is read separately through `POST /v1/sessions/:id/goal/read` and matched to the same identity/revision. Reads refresh only while the conversation is foregrounded. Unknown activation does not expose an active-goal action. Goal mutation responses retain their live activation; unknown activation never implies permission to pause or resume an active goal.

The add menu opens the existing goal editor, or creates an absent/completed goal through `POST /v1/sessions/:id/goal/create`. Goal read/create, archived-session restore and automation catalog/control routes are implemented in the sibling `dsh-mobile-bridge` source and require an updated Gateway build. The installed desktop app/plugin is not replaced automatically. Old Gateways report an actionable command error rather than creating mobile-only goal state.

## Validation scope

- Node 22.23.2; 43 test files / 225 tests pass, including desktop icon hashes, malformed goal payloads, activation identity/revision guards, drawer filtering/tree/manual order and search merging. TypeScript and formatting pass.
- Android arm64 native debug build and isolated review-package install pass with the navigation-bar module. iOS Pods resolve; Android/iOS JavaScript exports pass.
- Android visual checks use a loopback-only synthetic Gateway. Covered light/dark, regular and enlarged text, keyboard editing/search, anchored menu scrolling, workspace trees, archived filters, goal create/edit/clear/resume, queue/input ordering and persisted manual movement. Device display/font/appearance overrides are restored after checking.
- Gateway HTTP checks exercise pairing authorization, objective/CAS validation, encoded session identity, read/create forwarding and activation preservation against a synthetic desktop wire. No real model task, approval or desktop goal is executed.
- Physical devices, an iOS interaction sweep, production desktop connectivity and deployed-Gateway compatibility remain unverified. A passing UI/test matrix does not establish production deployment or physical-device behavior.
- The production dependency audit still has four reported Expo CLI/config advisories. The audit remains an enabled CI gate.
