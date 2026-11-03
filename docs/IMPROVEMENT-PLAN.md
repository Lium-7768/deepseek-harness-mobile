# Mobile improvement tasks

Goal: align the native client with the desktop's visual language while preserving mobile navigation, accessibility, keyboard avoidance, safe areas and touch targets. Desktop download/update/install surfaces are out of scope. Existing uncommitted changes are the baseline and must be preserved.

## Tasks (in execution order)

| ID  | Task                              | Acceptance                                                                                                        | Status |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| R1  | Request timeouts and cancellation | Login, pairing and commands have deadlines; reads accept cancellation; uncertain command outcomes are explained   | Done   |
| R2  | Reliable startup                  | SecureStore failures show retry/reconnect, never an endless spinner                                               | Done   |
| R3  | SSE lifecycle                     | Ready handshake, actual backoff, idle detection, CRLF parsing, canceled generations cannot write                  | Done   |
| R4  | Query ownership                   | Connection-scoped cache lifecycle, central query keys, correct invalidations and native foreground handling       | Done   |
| R5  | Subagent synchronization          | Visible child transcripts refresh while active, including after reconnect; native keyboard handling               | Done   |
| R6  | Long conversations                | Bounded live state without lost history; avoid redundant full-window work                                         | Done   |
| U1  | Desktop reference inventory       | Record actual desktop palette, spacing, type and component references                                             | Done   |
| U2  | Main native surfaces              | Align connect, workspace, drawer, conversation and composer; verify light/dark and narrow screens                 | Done   |
| U3  | Secondary native surfaces         | Align settings, menus, approvals, subagents and rename screens; retain accessible native interactions             | Done   |
| A1  | Structure and RN practices        | Thin routes, transport outside UI, shared hooks, lifecycle cleanup, no local-path test fixtures, actionable audit | Done   |
| V1  | Final verification                | Behavior tests, typecheck, Expo compatibility/bundles and native visual review with documented limits             | Done   |

## Evidence

- Before this work: Node 22.23.2, 175 tests and TypeScript checks passed (previous review).
- Desktop reference: `/Users/meiyu/code/deepseek/deepseek-harness` and `/Applications/DeepSeek Harness (Unsigned 0.2.2-alpha.2).app`.
- This document tracks the authorized scope. Reference documentation is evidence, not an instruction to broaden scope or modify the desktop runtime.

## Additional review tasks

| ID  | Finding                                                       | Action / status                                                                                                          |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| A2  | SDK compatibility check failed on the original dependency set | Updated compatible Expo/RN patches and Metro peer dependencies; migrated the Swift patch — done                          |
| A3  | Test depended on a private `/tmp` history file                | Replaced with a portable synthetic conversation — done                                                                   |
| A4  | Unused imports and dead code obscured feature boundaries      | Cleaned imports, connected the preset back action, enabled unused-code compiler checks and formatting CI — done          |
| A5  | Android keyboard covered the send controls                    | Applied the real shell-header keyboard offset on both platforms; verified multiline input and send remain visible — done |
| A6  | Read-only desktop disabled local phone appearance             | Decoupled local selection; corrected dark logo/caption contrast — done                                                   |
| A7  | Production dependency audit reported 25 advisories            | Applied compatible transitive patches; 4 upstream CLI/config advisories remain, tracked below                            |
| A8  | Route switches discarded unsent text                          | Added bounded in-memory per-session drafts, safe success clearing and connection cleanup — done                          |

## Upstream dependency follow-up

The remaining audit entries are Expo CLI/config transitive dependencies: `zod@3` (requires a v4 migration), `glob@13` / `minimatch@10` (upstream major upgrades), and `deepmerge@4` (no patched release). These are build/config tooling carried by Expo, not mobile Agent execution. Do not force incompatible major overrides or suppress the audit. Update the Expo toolchain once compatible fixes ship; `pnpm audit --prod` currently remains a failing CI gate. All compatible patch-level advisories, including the critical `shell-quote` entry, were resolved.

## Final acceptance evidence (2026-11-03, Asia/Shanghai)

- Node 22.23.2: 35 test files / 190 tests passed; TypeScript with unused-code checks passed; formatting passed.
- `expo install --check`: dependencies compatible.
- Final iOS and Android exports: passed separately. Native platforms are explicitly declared as iOS/Android; no Web deliverable is added.
- Updated Android arm64 debug build: passed. Isolated review package uses a temporary Gradle application-id override; production package identity is unchanged. The final reinstall hit the emulator's internal-storage limit; visual interaction checks used the earlier review binary with current JavaScript via Metro.
- Updated iOS simulator native build: passed. Simulator launch with normal ad-hoc signing: passed, including the real SecureStore restore and connect screen. An unsigned run also verified the startup failure screen. A redundant dSYM build initially ran out of host disk; after removing only this task's temporary caches, the signed build passed using DWARF debug information.
- Android visual review: connect, workspace, drawer, conversation, model sheet, settings, approval and child conversation; light/dark; 320pt narrow viewport; multiline keyboard/send visibility. Restored the emulator's original 1080x2344 display override afterward.
- Synthetic fixture used for visual review: no real model prompts, desktop setting writes, approvals, archived sessions or file changes were executed.
- Dependency audit: compatible transitive fixes reduced 25 advisories to 4; remaining Expo tooling findings are A7 above. This gate is reported honestly as unresolved upstream work.
- Desktop source/app remain unchanged. No source changes committed or published.

Screenshots are retained in the chat's `mobile-review` artifact directory. No blanket claim of physical-device, push-notification or production Gateway end-to-end validation is made.

## Conversation parity follow-up

The first visual pass did not cover enough of a complete conversation. This follow-up explicitly reopens conversation acceptance.

| ID  | Task                                                                                              | Status |
| --- | ------------------------------------------------------------------------------------------------- | ------ |
| C1  | Match flow spacing and turn action placement against desktop source                               | Done   |
| C2  | Repair expanded process/tool nesting, stable keys and disclosure persistence                      | Done   |
| C3  | Improve Markdown headings, links and code formatting for full answers                             | Done   |
| C4  | Verify multi-turn success, intermediate replies, retries/failure and running states in light/dark | Done   |

### Conversation follow-up evidence

- Rechecked `MessageItem`, `ChatGroupSeat`, `DisclosureRow`, `TurnProcessNodeView`, `TurnTailNodeView`, Markdown and code styles in the desktop source.
- Completed-turn actions now appear on the closing response, rather than on every intermediate Assistant message. Flow-owned 4/12/16/24pt boundaries replace a blanket list gap and negative tool margins.
- Opening a completed Turn reveals its tool/reasoning rows directly. Failure and stop processes remain visible. Stable keys and screen-owned disclosure state preserve details through list recycling.
- Activity inventory and running status now scroll with the transcript instead of permanently reducing the reading viewport. A running process starts open and can be collapsed.
- Markdown headings no longer combine a full container gap with another heading margin. Code preserves whitespace, scrolls horizontally, and uses the desktop's light/dark syntax palette for JS/TS/JSON/shell/Python/CSS/HTML. Unsupported/large code stays plain text; copying preserves the original source. External links open with the OS.
- Added full synthetic success (two Turns, intermediate reply, multiple tools, retry, diff, code, table, quote and link), failed/retry, and running transcripts. Visual review covers both appearances; no real desktop task was executed.
- 37 test files / 196 tests passed; TypeScript and formatting checks passed. Conversation changes are JavaScript/presentation only; the existing native review binary was used with Metro. Dual-platform bundle verification is recorded in the chat.
- Original upstream audit result remains 4 Expo tooling advisories; the highlighting dependencies introduce no additional reported advisories.

- Verified the Metro core-only highlighting entry: final bundles are approximately 4.8 MB Android / 4.6 MB iOS; unused language registries are excluded.

## Deep UI review (2026-11-03)

| ID  | Finding / acceptance                                                                                       | Status |
| --- | ---------------------------------------------------------------------------------------------------------- | ------ |
| D1  | Narrow screens at 150% text: send button, toolbar, hero and settings values remain visible                 | Done   |
| D2  | Model/menu sheets fit the actual modal viewport and keyboard; all options and dismissal stay reachable     | Done   |
| D3  | Drawer actions, navigation state, status indicators and rename editor avoid mobile interaction traps       | Done   |
| D4  | Recheck normal/large text, light/dark, keyboard and multiple settings/picker states; record actual results | Done   |

### Deep UI review evidence

- Simulated a 320pt viewport at 150% font scale, then restored 1080×2344 and font scale 1.0. Checked regular text and enlarged text in the live Android review app with synthetic Gateway data.
- Composer now uses effective reading width: small screens use an icon model trigger, disabled model text yields width, text input grows with font size, and the send control stays visible. The workspace hero/composer stack is scrollable when the keyboard or large text leaves insufficient space.
- Model and general menu sheets use the measured modal viewport and keyboard top, avoiding double keyboard subtraction on resized Android windows. Menus have a visible close control and accessibility escape. Inner surfaces no longer add a second shadow band. List content shrinks and scrolls, including reasoning/provider controls. Searching prioritizes results, empty results remain visible with the keyboard, and search/filter state resets on close.
- Long model names stack above provider information on narrow/large-text screens. Verified a 32-model synthetic catalog, filtering and no-match states.
- Settings fields stack on narrow/large-text screens instead of squeezing explanations into a narrow left column. Appearance, preset badges/identifiers and connection details can wrap; connection details scroll. The active settings tab scrolls into view.
- Drawer rows meet a 44pt floor; the overflow menu owns archive instead of a one-tap archive icon beside every title. Workspace titles yield width. Action menus announce buttons; actual choices announce radio/checked state.
- Rename screens scroll with the keyboard. Editing a title prevents late hydration from restoring deleted text; submit uses the mutation's handled error path. Empty and duplicate pending submissions remain guarded.
- Approval/plan action buttons stack at narrow effective widths. Custom answers now have explicit dark-theme text, placeholder and selection colours. Disabled primary buttons use readable neutral ink. Conversation waiting/connecting status uses a pending colour rather than a green connected dot.
- Narrow/enlarged Markdown tables keep readable columns and scroll horizontally when necessary. Usage/context panels scroll within the same bounded sheet.
- Visually checked workspace, complete conversation, model sheet/search/keyboard, settings general/models/plugins/presets/detail, connection, drawer, approval/question, rename/keyboard, and statistics/context sheets. No real approvals, messages, session renames or desktop setting changes were sent.
- 38 test files / 200 tests passed. TypeScript, formatting and diff-whitespace checks passed. Added behavior checks for resized-vs-overlaid keyboard geometry and enlarged-text layout. This pass changes JS/UI only; native modules were not rebuilt. Android visual checks and iOS/Android JS export are the validation scope; physical devices and an iOS interaction sweep remain unverified.

- Final Android/iOS exports passed (`/tmp/ui-deep-export-final`); emulator display/font settings restored. Screenshots for this pass are in the chat artifact directory `ui-deep-review`.

## Goal dock follow-up (2026-11-03)

| ID  | Finding / acceptance                                                                                                        | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| G1  | Goal strip belongs directly above the composer; blocked goals expose resume, edit and clear with native touch targets       | Done   |
| G2  | Canonical nested goal projection, CAS reference validation, absent/complete hiding, pending guard and edit-success handling | Done   |
| G3  | Android light/dark, keyboard editing and 320pt / 150% text; restore emulator display and appearance settings                | Done   |

- Moved the existing goal UI from below the workbench tabs into the composer's context header. It follows the desktop's neutral raised strip and canonical goal/play/pause/edit/trash artwork. Phone layouts use two text lines and 44pt action targets; enlarged layouts put actions on their own row. Full objective/blocker details scroll within a bounded expansion.
- Blocked goals previously had no resume button. Blocked and paused goals now expose resume. An immediate in-flight guard prevents duplicate Goal CAS submissions; editing closes only after success, and errors retain the draft. Goal UI/parser now have their own modules instead of living inside the background activity component.
- Added synthetic active/paused/blocked/complete/absent goal sessions and stateful local-only CAS mutation handlers. Confirmed blocked → resume and editing/saving against this fixture; no production desktop task or goal was changed.
- 39 test files / 204 tests passed; TypeScript and formatting checks passed. Android screenshots cover normal light/dark, keyboard editing and 320pt / 150% text. Physical devices and iOS interaction remain unverified. The actual user's missing projection has not been inspected; absent, completed or malformed goal payloads intentionally do not render a strip.
- Earlier Done entries describe those review passes, not proof of full behavioral equivalence. The separately confirmed permission confirmation/current-value/locking/pending regressions and lost model-catalog failure states remain open; this follow-up fixes the goal dock only.
