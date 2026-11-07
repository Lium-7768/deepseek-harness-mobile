# Mobile implementation and acceptance

The native client follows the desktop source in `/Users/meiyu/code/deepseek/deepseek-harness`. Safe areas, native navigation, keyboard avoidance, touch targets, Dynamic Type and reduced motion remain native adaptations. Desktop downloads, installation and updates are outside scope.

## Implemented behavior

| IDs       | Area                           | Current behavior                                                                                                                                                                                                                                               |
| --------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1–R6     | Transport and lifecycle        | Request deadlines/cancellation, recoverable credential restore, scoped query cache, SSE handshake/backoff/idle detection, foreground refresh, bounded history and drafts                                                                                       |
| U1–U3     | Native surfaces                | Shared desktop palette/type/icons across workspace, conversation, drawer, settings, interactions and subagents                                                                                                                                                 |
| A1–A6, A8 | Structure and native practices | Thin file routes, feature/query/action modules, pure logic helpers, unused-code checks, formatting, native monospace, keyboard offsets and local appearance                                                                                                    |
| C1–C4     | Conversation                   | Turn-owned completion actions, expandable tool/reasoning flow, stable disclosure state, diff/code/table rendering and horizontal code scrolling                                                                                                                |
| D1–D4     | Layout and interaction         | Compact controls and stacked fields for enlarged text; bounded keyboard-aware sheets; safe rename/archive interactions and native accessibility                                                                                                                |
| G1–G3     | Goal dock                      | Compact goal before queue and input, with a visible blocked reason and tap-to-read details; live activation determines pause/resume; desktop APIs and CAS; guarded, recoverable editing                                                                        |
| B1        | Drawer view menu               | Floating card anchored below its trigger; workspace/workspace-tree/flat, manual/recent sorting, all three archived filters; fixed header/footer                                                                                                                |
| B2        | Drawer search                  | In-header input; immediate title/workspace/id matches; debounced cancellable history search; deduplicated results with workspace/snippet, skeleton/error/empty states                                                                                          |
| B3        | Manual order                   | Per-desktop client preferences persist across restarts; native row-menu move controls preserve hidden members and workspace boundaries                                                                                                                         |
| I1        | Icon parity                    | Shared SVG geometry, sizes and regular/medium weights match a portable desktop-reference fixture; only `link-off` and `arrow-up` are native-only                                                                                                               |
| N1        | Android system UI              | System CA trust only; navigation icons follow the app appearance, including native overlay windows; LAN HTTP compatibility is documented accurately                                                                                                            |
| M1        | Model control                  | The default Codex-style effort card opens a grouped model directory when its central model control is tapped. Search appears for catalogs over four models; current routes are checked, and selection returns to the slider. Previous/next cycling is removed. |

## Completed review fixes

| IDs             | Acceptance                                                                                                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1–P0-4, P0-6 | One selection controller serves hero and conversation: destructive full-access confirmation, no-op current choices, published-option validation, known-idle event guard, confirmation-time identity/status recheck, immediate serialization and visible pending state |
| P0-5            | Model picker preserves catalog loading, fetch failures, routing unavailable and provider failures. Route lookup uses provider plus model id; trigger labels match picker labels.                                                                                      |
| B4              | Archived rows expose restore through the new narrow Gateway unarchive route; list and search share archive visibility.                                                                                                                                                |
| B5              | Plugin, automation and More drawer entries are wired. Automation catalog supports pause/resume/delete with version checks; a desktop-style animated ring respects reduced motion.                                                                                     |
| P1/P2           | Modal owns one surface/elevation; no redundant close toolbar; keyboard geometry uses lengths within the same Modal; unused route helpers/styles and stale comments removed; settings accessibility copy uses locale.                                                  |

## Follow-up review tasks

| ID  | Status | Resolution and regression coverage                                                                                                                                                                                                       |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Done   | Workspace and session observers share one incremental event-query definition, including SSE merging, settled-chunk compaction and bounded complete turns. Both reads and subscription hydration retain the older-history cursor.         |
| F2  | Done   | The shared selection controller locks permissions while the stream is connecting or disconnected and rechecks connectivity at destructive confirmation.                                                                                  |
| F3  | Done   | Only an explicit missing/unsupported schedule route shows the upgrade message. Network, authentication, timeout and invalid-response errors show a load failure with retry. Catalog entries are validated before rendering.              |
| F4  | Done   | Goal read/create/mutation responses are validated at the API boundary. Mutation callbacks also guard full views before replacing cached Goal data; null, scalar and malformed payload regressions are covered.                           |
| F5  | Done   | Blocked goals display a one-line reason. Tapping the summary opens the complete reason in a native alert; ordinary goals retain their compact layout.                                                                                    |
| F6  | Done   | Removed framework `isLightTheme` references. Day/night booleans control status icons; navigation icon attributes are restricted to `values-v27`, with a dark legacy navigation background. API/resource lint passes.                     |
| F7  | Done   | Running-ring rotation and SVG dash changes use Reanimated UI-thread worklets. Backgrounding and live reduced-motion changes cancel the animation; lifecycle tests cover both.                                                            |
| F8  | Done   | Workspace permissions use `maxMessages: 1` under a distinct parameterized history-tail key. Existing history-prefix invalidations refresh both queries without sharing transcript data.                                                  |
| F9  | Done   | Component interaction tests cover schedule error/retry branches, pause/resume/delete serialization and confirmation, Goal draft retention, repeated submission and pending dismissal. The Goal editor closes the same-render cancel gap. |
| F10 | Done   | Sheet dismissal documentation now names backdrop, Android Back and accessibility escape, with no claim of a visible close toolbar.                                                                                                       |

## Follow-up review fixes

| ID  | Status | Resolution                                                                                                                                                                                                                                                                                                           |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F11 | Done   | Composer controls now use the desktop 28pt geometry with 44pt native hit areas. Row, tool-cluster and trailing gaps match the desktop compact row; comments describe the touch adaptation.                                                                                                                           |
| F12 | Done   | Goal clear mutations accept the desktop `GoalRef` response only. The unsupported `{ cleared: true }` branch was removed from the mobile contract and fixture.                                                                                                                                                        |
| F13 | Done   | Full-access confirmation has a bounded lifetime and tokenized callbacks. A swallowed or throwing native Alert cannot leave permission selection permanently locked, and stale callbacks cannot authorize a command.                                                                                                  |
| F14 | Done   | Live Goal polling starts only after a non-complete Goal is present; absent and complete sessions perform the initial read without a recurring five-second request.                                                                                                                                                   |
| F15 | Done   | Schedule action results distinguish `schedule_not_found`, `schedule_conflict`, and malformed response codes, with a refresh after stale task errors.                                                                                                                                                                 |
| F16 | Done   | Removed nine unused locale entries and added the missing schedule not-found copy.                                                                                                                                                                                                                                    |
| F17 | Done   | Replaced deprecated `react-test-renderer` with React Native Testing Library and `test-renderer`; removed unused `react-dom` from native dependencies. Added portable RNTL support for the Vitest native component tests.                                                                                             |
| F19 | Done   | The composer renders the desktop's `todo` dock (`conversation.input.dock` order 0) from the `todos` projection, collapsed by default with the joined readings and one StateDot-marked line per task. The dock row above the composer keeps its reserved 22 so a landing projection no longer resizes it.             |
| F20 | Done   | The plan chip (`conversation.input.plan`) lets the phone leave plan mode by submitting `/plan off`; it follows the desktop's `pending ? !active : active` rule, dims while the command is in flight, and prints the failure line instead of claiming success.                                                        |
| F21 | Done   | The composer opens a `/` command menu fed by `/v1/sessions/:id/commands` (gateway 0.1.6). Detection follows the caret rather than the end of the draft, prefix matches rank first, and a pick replaces only the token it opened on.                                                                                  |
| F22 | Done   | Account and balance is a read-only settings section (desktop `order -10`), fed by `/v1/account/profile` and `/v1/account/balance` (gateway 0.1.7). Sign-in, sign-out and bonus acknowledgement never cross the gateway: its device token carries no scope, so a paired phone can read the account but not change it. |
| F18 | Done   | Goal edit requests depend on the complete Goal object, so a newly read desktop objective is used when opening the editor. Existing unsaved drafts remain intact until a new edit request.                                                                                                                            |
| F19 | Done   | The Codex-style slider card remains the default model surface. Its composer trigger shares the transparent r8 chrome and padding of permission/mode controls. The central summary now opens a searchable provider-grouped directory for direct model selection.                                                      |
| F20 | Done   | Reduced-motion running rings use the desktop static arc (18/150, offset -3). Expired full-access confirmations explain that no permissions changed and require a new confirmation.                                                                                                                                   |
| F21 | Done   | Both hero and session expose model-query reload inside the slider card, including failure/loading states and immediate retry serialization. Slider route changes cancel stale gestures without losing measured width.                                                                                                |
| F22 | Done   | Removed the unused raw `modelLabel` helper. Pods were regenerated for the current pnpm virtual paths; all 96 source paths exist. README documents rerunning Pods after any dependency/peer change. The portable RNTL shim fails on unsupported RN surfaces and does not certify native layout.                       |

## Conversation reading and copying

A long conversation keeps following newer content after the first jump: each content change
re-pins while the reader stays at the bottom, and the reader's own send opens a short window in
which growth keeps following even if a measurement trails the new content. A drag away from the
bottom releases the follow, and a programmatic jump cannot. History prepends restore the offset
explicitly because `maintainVisibleContentPosition` would anchor the first visible row across the
same jump it has to yield to. Reaching one screen from the top requests the next older page.

Every markdown block is long-press selectable — paragraphs, headings, quotes, list items, table
cells and code — and every assistant block, tool payload, code block and table also carries its
own copy control. This departs from the desktop, where `MessageIconActions` renders only in
`TurnTailNodeView`: a pointer can drag-select an earlier block, a phone cannot. Each confirmation
names what reached the clipboard — lines and characters for text, lines for code, rows and columns
for a table — because a phone cannot show the selection it is about to copy. A table copies whole
as TSV, which pastes into a spreadsheet as real columns.

## Settings density

A settings page is read at arm's length on a 402pt screen, so each tab now carries one
level: the section bar names the page and the page prints only what the phone may change.
The model tab used to expand every provider catalog inline — dozens of routings, each a
card — for a page that offers one choice; it is now one row showing the current default,
and the choice happens in a searchable sheet that reuses the composer's directory. Plugin
namespaces lost their per-entry cards for hairlined rows, presets lost their three footer
controls (the row opens the descriptor, which now carries the how-to guide), and the
account page prints one fact per row instead of a title, value and boilerplate sentence.
The release line returned to the desktop's 14/22 primary label while gaining its 16px
padding.

An automation card carried three full-width buttons for one task. The card now reads as a row —
title, state, two lines of prompt, next run — and its verbs live behind the same `…` menu the
session rows use.

The session header spent two bands on the same job: a tab row, then a warning strip for pending
interactions, then up to three retry notices when the three reads failed together. Pending now
rides in the tab row as a badged destination, and one `刷新会话失败` notice retries whichever of
the three reads is down.

A session row's `…` menu listed eight verbs in one run, with 归档 next to 重命名. It now reads in
three groups — the row's identity, what it produces, and the one destructive action — and the
interactions card asks for a free-text answer with one `其他答案` row instead of opening an empty
74pt field for every question.

A tool payload spent three rows on its own chrome — a label row, a `还有 N 行` line, and a fold
control — and put the text in a horizontal scroller inside the vertical transcript, so a long
line had to be dragged sideways with no cue that it could be. The label, size, fold and copy now
share one header row, and the payload wraps and folds instead of scrolling either way.

The dock statistics lose their second readings: `82 轮 5617 步` and `1740M tok` state the counts,
while throughput and cache hit wait in the panels they already filled. The drawer's view options
become a bottom sheet with three titled groups, replacing the anchored card that measured the
drawer, clamped itself, and scrolled eight radio rows inside the result.

Above the composer the desktop stacks three cards — the task list, the goal bar and the
queue. On a phone they took roughly a third of the transcript with their own outlines and
elevation, so they are now one row of 28pt chips (`任务 1/3`, `进行中的目标`, `队列 2`) and a chip
opens its own dock underneath; a blocked goal reads in the chip itself. The control row drops
from five triggers to three: `+`, the model, and send, because the permission and mode
selectors opened the same menus the `+` menu already lists — those rows now print the current
value that the control row stopped naming.

The drawer loses the chrome it repeated: `插件 / 自动化任务 / 设置` are one chip row instead of
three stacked rows, the sync control takes the slot of the permanently disabled
"desktop-only" add-workspace icon, and the footer that repeated 设置 and 同步 is gone, so each
destination appears once and the session list gains ~110pt. The transcript's injected-context
bookkeeping is one line (`上下文注入 · name 等 N 个`) instead of one line per source, the
interactions page drops the heading that restated its own title and the desktop's approval id,
and a job row no longer prints its kind twice.

## Attachments

The gateway refuses a request body over 12 MB, and a phone photo reaches it as base64
inside a JSON envelope, which inflates the bytes by a third. Four full-resolution photos
therefore fail the send before any text is added, and the reader only sees "发送失败". The
picker now returns files rather than base64, each image is re-encoded on the device to a
1600-pixel long edge at JPEG 0.7, and the draft refuses what no longer fits a 9 MB budget
that leaves room for the envelope. The rail prints the encoded total beside the
thumbnails, so the size is answered before the send instead of after it.

The limits live in `src/components/attachment-policy.ts`; `ATTACHMENT_BODY_CEILING_BYTES`
mirrors the gateway constant and must move with it.

## Quoting and references

The reply card's quote control copies a message into the draft as blockquote text, and the
composer's `@` menu completes the same two sources the desktop overlays: workspace paths from
`fileReferences/list` and other Sessions from `sessionReferenceResolver/candidates`. The phone
asks the Gateway only after the token stops changing, because each query is a Host filesystem
listing; the last answer wins. A picked directory keeps the token open — `@src/`, or an
unterminated `@"my dir/` — so the rest of the path can be typed after the menu closes. Path
formatting and trigger detection live in `src/components/mention-logic.ts`, ported from the
Host's `file-reference/grammar` so both clients insert the same text.

## Sending while the stream is down

A paired client whose event stream dropped prints the reconnect bar, and the composer now
refuses to send from the same condition: a prompt accepted then would start a turn nobody
can watch. The editor stays editable, the primary control is disabled with that reason,
and stopping a running turn stays available because it reaches the Host over HTTP.

## Reading position

A conversation left mid-read reopens where it was left. The gesture's settled offset is
remembered per session, and a reopen applies it once the transcript reports a height that
still addresses it; a transcript that came back shorter falls back to the newest message
after a 1.2 s wait. Returning to the bottom forgets the position, so the next open lands
on the newest message the way a reader who never scrolled expects.

## Completion notices

iOS suspends a backgrounded app, and the stream only runs while the app is in the
foreground, so a turn that ends while the phone is locked produces nothing: there is no
push channel from the Gateway. What ships is what the platform allows — a local notice
when a turn finishes while the reader is elsewhere in the app, an icon badge for
completions they have not looked at, and a summary line on return naming how many
conversations finished while the app was away. The resumed session list is the source for
that count: its `running` flags are compared against the sessions seen running before the
app left the foreground. Permission is requested at the first accepted send, which is both
the first moment a notice could matter and the only prompt iOS offers.

## Native structure

The root layout is wrapped in an error boundary: one bad transcript row used to unmount
the navigation tree and leave a white screen, now it shows a recovery that remounts in
place. Dynamic catalogs (schedules, plugin namespaces) render through `FlatList` with
memoized rows instead of a `ScrollView` map. Destructive confirmations (archive, remove
workspace, delete schedule, forget connection, full access) use a bottom `ConfirmSheet`
with the app's own typography; plain failures keep `Alert.alert`. File writes use the
current `expo-file-system` `File`/`Paths` API, appearance is stored in AsyncStorage
while credentials stay in SecureStore, attachment images render through `expo-image`
with a memory-disk cache, the entrance fade and skeleton pulse run on Reanimated
worklets, and every interactive `Pressable` carries an Android ripple (the full-screen
drawer backdrop is the one deliberate exception).

## Dynamic Type

Text inside a fixed-height box carries a font cap, because an explicit `lineHeight` does not
grow with the reader's text size and would clip the label. Chips, the context meter, table
cells, diff paths, message action rows and drawer rows cap at 1.3; a dense one-line drawer
entry caps at 1.15. Prose stays uncapped so body text grows freely. Both caps live in
`src/theme/text-scale.ts`; no other limit is applied anywhere in the client.

## Screen size

The client targets phones. `app.json` declares `supportsTablet: false` and locks portrait,
because the layout is a single column: on a tablet the transcript would render as one very
wide line and the session drawer would cover content it could otherwise sit beside. A tablet
layout needs a permanent drawer and a centered content column with a reading width, which is
its own change with its own verification; declaring tablet support before that ships a
worse experience than not offering it.

## Remaining limits

- The `@` file-reference trigger from `ui-input-trigger` is not implemented: it needs a file tree the gateway does not forward, and is tracked separately from the `/` command menu.
- The account section prints identity and balance only. Changing either requires the desktop.

The dependency audit reports four advisories in Expo CLI/config dependencies. Patched versions require incompatible major upgrades for zod/glob/minimatch; deepmerge has no patched release. These are reported as an external toolchain limitation, not hidden by the audit gate. No incompatible overrides are forced. Production desktop deployment and physical-device/iOS interaction checks remain outside this validation.

## Goal integration

The desktop's durable `goal` projection supplies identity, revision, objective and phase. Process-local activation is read separately through `POST /v1/sessions/:id/goal/read` and matched to the same identity/revision. Reads refresh only while the conversation is foregrounded. Unknown activation does not expose an active-goal action. Goal mutation responses retain their live activation; unknown activation never implies permission to pause or resume an active goal.

The add menu opens the existing goal editor, or creates an absent/completed goal through `POST /v1/sessions/:id/goal/create`. Goal read/create, archived-session restore and automation catalog/control routes are implemented in the sibling `dsh-mobile-bridge` source and require an updated Gateway build. The installed desktop app/plugin is not replaced automatically. Old Gateways report an actionable command error rather than creating mobile-only goal state.

## Validation scope

- Node 22.23.2; 72 test files / 453 tests pass, including desktop icon hashes, malformed Goal and schedule responses, expired confirmation feedback, Goal polling, shared-query cursor/window contracts, disconnected selection gates, schedule/Goal editor interactions, slider-card drill-down/search/selection, reload/retained geometry, reduced-motion artwork, drawer filtering/tree/manual order and search merging. TypeScript and formatting pass.
- Android arm64 native debug build and isolated review-package install pass with the navigation-bar module. iOS Pods resolve; Android/iOS JavaScript exports pass.
- The latest model-control review also passes an unsigned arm64 iOS Simulator Release native build after `pod install`. `Podfile.lock` matches the installed Pods manifest and all 96 local Pod source paths resolve. This is not a signed device archive or App Store validation.
- Android API/resource lint (`NewApi`, `InlinedApi`, `ResourceType`) passes with no findings. Full `lintDebug` crashes in the third-party Worklets Kotlin Gradle-script analysis (`Cannot find a KaModule for the VirtualFile`); no lint checks are disabled or baselined in the repository to hide that failure.
- This model-directory pass verifies iOS light/dark, enlarged text, software-keyboard clearance, search, current-route selection and switching back to the effort card against a loopback synthetic Gateway. Simulator font and theme changes are restored after the check.
- Android visual checks use a loopback-only synthetic Gateway. Covered light/dark, regular and enlarged text, keyboard editing/search, anchored menu scrolling, workspace trees, archived filters, goal create/edit/clear/resume, queue/input ordering and persisted manual movement. Device display/font/appearance overrides are restored after checking.
- Gateway HTTP checks exercise pairing authorization, objective/CAS validation, encoded session identity, read/create forwarding and activation preservation against a synthetic desktop wire. No real model task, approval or desktop goal is executed.
- A signed Release build installs and launches on a physical iPhone (iOS 26.3). The deployed Gateway was exercised end-to-end against Desktop 0.2.2-rc.1 with `dsh-phone-access` 0.1.9: `/v1/sessions/list` projections, the `session/projections` sub-agent roster, `subagents/interruptByUser`, queue and job snapshots, and the public tunnel all answered real Host data. An on-device interaction sweep of those new surfaces is still unverified, so a passing UI/test matrix does not establish their rendered behavior.
- The production dependency audit still has four reported Expo CLI/config advisories. The audit remains an enabled CI gate.
