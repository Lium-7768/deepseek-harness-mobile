# Web mobile styles the native client copies

The native client is compared against the Web client's own computed styles at
phone width (393×852, `isMobile`, coarse pointer). This document is the census:
for every screen it names the Web value and the native file that carries it, so a
review can compare one line at a time instead of eyeballing two screenshots.

## How the values were read

The Web client is a desktop layout; at 393px it keeps its rail and does not
reflow the conversation column (266px inside a 337px centre column). Screenshots
of it are therefore a typography and colour reference, not a layout reference.
Type, colour, control metrics, and the vertical rhythm transfer; layout and the
interactive chrome (drawer, modal, tooltip, select, sheet) follow React Native's
own conventions, which is the agreed scope.

Sources, in precedence order:

1. `packages/client/ui-theme/src/styles/design-platform.css` — palette and the
   semantic alias layer (`label-primary|secondary|tertiary|caption`, `bg-overlay`,
   `specific-sidebar-fill`, `state-error-primary`, `link`).
2. `packages/client/ui-theme/src/styles/gradient-shadow-text.css` — markdown ramp
   and code font.
3. Computed styles read from a running Web client at 393×852, across 24 surfaces
   (workspace, drawer, five settings sections, conversation, tool rows, markdown,
   message actions, user bubble, running state, header/tabs, trajectory, pickers,
   account menu, row menu, rename dialog).

The native projection of (1) is `src/theme/tokens.ts` and `src/theme/index.ts`;
never hand-tune a colour in a screen, re-derive it in the theme instead.

## Screen inventory

| # | Screen | Route / entry | Native files | Web reference |
| --- | --- | --- | --- | --- |
| 1 | Connect | `/connect` | `app/connect.tsx` | native-only (no Web counterpart) |
| 2 | Scan pairing QR | `/connect/scan` | `app/connect/scan.tsx` | native-only |
| 3 | Workspace home | `/workspace` | `app/workspace.tsx`, `src/components/workspace-composer.tsx`, `workspace-shell.tsx` | hero + composer (`01-workspace`) |
| 4 | Drawer / session list | drawer on any screen | `src/components/session-drawer.tsx` | sidebar (`02-drawer`) |
| 5 | Session conversation | `/session/[sessionId]` | `app/session/[sessionId].tsx`, `native-markdown.tsx`, `native-tool-card.tsx`, `native-conversation-status.tsx`, `native-message-feedback.tsx`, `native-message-attachments.tsx`, `native-queue-dock.tsx` | conversation (`04*`) |
| 6 | Session header + tabs | same screen | `src/components/workspace-shell.tsx`, `session-workbench.tsx` | header/tabs (`05`) |
| 7 | Trajectory | 轨迹 tab | `src/components/session-workbench.tsx`, `session-trajectory-logic.ts` | trajectory (`06*`) |
| 8 | Settings — 通用设置 | `/settings?section=general` | `app/settings.tsx` | settings (`03-settings-general`) |
| 9 | Settings — 桌面端连接 | `/settings?section=connection` | `app/settings.tsx` | phone access (`03b`) |
| 10 | Settings — 模型 | `/settings?section=models` | `app/settings.tsx` | models (`03c`) |
| 11 | Settings — 内置插件 | `/settings?section=plugins` | `app/settings.tsx` | plugins (`03d`) |
| 12 | Settings — Agent 预设 (+ preset detail) | `/settings?section=presets` | `app/settings.tsx` | presets (`03e`) |
| 13 | Model select | `/session/[sessionId]/model` | `app/session/[sessionId]/model.tsx`, `native-model-selection.tsx`, `native-selection.tsx`, `native-list.tsx` | model picker (`07b`) |
| 14 | Mode select | `/session/[sessionId]/mode` | `app/session/[sessionId]/mode.tsx` | mode picker (`07c`) |
| 15 | Access select | `/session/[sessionId]/permission` | `app/session/[sessionId]/permission.tsx` | access picker (`07d`) |
| 16 | Subagent | `/session/[sessionId]/subagent` | `app/session/[sessionId]/subagent.tsx` | none (mobile-only) |
| 17 | Pending interactions | `/session/[sessionId]/interactions` | `app/session/[sessionId]/interactions.tsx` | none (mobile-only) |
| 18 | Rename session | `/session/[sessionId]/rename` | `app/session/[sessionId]/rename.tsx` | rename dialog (`09-rename-dialog`) |
| 19 | Rename workspace | `/workspace/[workspaceId]/rename` | `app/workspace/[workspaceId]/rename.tsx` | rename dialog (`09-rename-dialog`) |

## Core tokens

Colour roles (light; dark carries the same names):

| Role | Desktop alias | Light | Use |
| --- | --- | --- | --- |
| `ink` | `label-primary` | `rgb(15,17,21)` | body text, row titles, trigger labels |
| `inkMuted` | `label-secondary` | `rgb(97,102,107)` | supporting copy, model trigger, kv keys |
| `inkTertiary` | `label-tertiary` | `rgb(129,133,140)` | descriptions, timestamps, tool verbs, inactive tab |
| `inkFaint` | `label-caption` | `rgb(173,178,184)` | placeholder, menu descriptions, separator dot |
| `surface` / `surfaceRaised` | `bg-base` | `rgb(255,255,255)` | page, dialogs, composer, sheets |
| `drawerBackground` | `specific-sidebar-fill` | `rgb(249,250,251)` | drawer, code blocks, goal dock |
| `surfaceMuted` | `bg-overlay` | `rgb(245,246,247)` | selectors, add button, nav chip, stepper |
| `accent` | `link` / `state-business-primary` | `rgb(65,118,230)` | active tab, send, tag, selection |
| `accentSoft` / `accentSoftText` | deepseek-100 / `label-primary-bluish` | `rgb(228,237,253)` / `rgb(14,48,116)` | preview badge, selected row |
| `userBubble` | `specific-bubble` | `rgb(237,243,254)` | user message |
| `danger` | `state-error-primary` | `rgb(236,19,19)` | turn error title |
| `border` / `borderStrong` | `border-l3` / control outline | `rgba(0,0,0,.12)` / `rgba(0,0,0,.16)` | hairlines, inputs |

Type scale (`src/theme/index.ts`): `eyebrow 11 · caption 12 · body 14 · message 14 · bodyLarge 15 · title 20 · hero 26`, lines `22 / 24 / 28 / 32`. The markdown ramp adds the desktop's `h1 21/30 · h2 19/28 · h3 18/26 · h4 14/24 · code 11/19 · banner 11/18 · inline code 12/19`.

## Surfaces

### Workspace home

| Element | Web | Native | File |
| --- | --- | --- | --- |
| hero headline | 26/500 · 32 | same | `app/workspace.tsx` |
| 预览版 badge | 12/500 · 18, `1px 7px`, r999, `accentSoft` / `accentSoftText` | same | same |
| workspace picker / mode trigger | 13/500 · 20, `label-primary`, icon 16, chevron 12–18 | same (44 touch floor) | same |
| summary label / detail | — (native chrome) | 11/500 · 16 tertiary / 12 · 18 tertiary | same |

### Composer (hero and in-session)

| Element | Web | Native | File |
| --- | --- | --- | --- |
| card | r28, `#fff`, `8px 0 0`, gap 12, elevation hairline, soft shadow | same (`radius.panel`, `surfaceRaised`, `elevation.card`) | `workspace-composer.tsx` |
| input | 16/400 · 24, pad `4px 8px 0 14px`, 36 floor, 336 cap | same | same |
| placeholder | `label-caption` (`inkFaint`), one ellipsized line; hero prints `描述你想要构建的内容, …` | same, per-surface string | same |
| add control | 28×28 r999 on `specific-selector`, 14pt plus | same (`surfaceMuted`, `plus-outline`) | same |
| send | 34×34 r999 `button-info-fill`, filled 16pt arrow, lifted 2px, disabled opacity .4 | same | same |
| control row | `2px 8px 6px`, gap 12, space-between, left group 12 apart, trailing pinned right | same | same |
| access / mode trigger | 28 tall, `0 4px 0 8px`, r8, 13/500 `label-secondary`, 4pt gaps, 14pt glyphs, chevron `label-caption` | same; label collapses to the glyph below a 460px card | same |
| model trigger | same chrome at 13/400; effort 13/400 `label-caption`, `flex-shrink 1000` | same (`inkFaint`, shrink 1000) | same |
| dock | centred row 12 apart, 4px top pad: statistics pills then the context meter | same | `app/session/[sessionId].tsx` |
| context meter | 14pt ring (2px stroke, `border-l3` track, `label-tertiary` arc) + 13/20 reading on a `1px 8px` r24 chip | same | `native-context-meter.tsx` |
| context panel | r12 menu surface, 12px padding: `上下文已用 N%` + `~used / window`, a 4-tall segmented bar sized `percent × share / total`, then one 8pt-swatch row per part | same, on a bottom-anchored scrim | same + `native-anchored-panel.tsx` |
| statistics panel | r12 menu surface, 16px padding: heading row with the section name and its headline value over a hairline, then `dt`/`dd` rows 6 apart | same, on a bottom-anchored scrim | `native-statistics-pill.tsx` |
| add menu | r12 menu: `添加` group (文件) then `指令` group (目标 / 权限 / 模型), each row a 16pt glyph, 13/20 label, mono token, right-aligned caption description | same, on a bottom-anchored scrim | `native-composer-menu.tsx` |

### Drawer / session list

| Element | Web | Native | File |
| --- | --- | --- | --- |
| column | 280 wide, `specific-sidebar-fill` | `min(280, 92vw)`, `drawerBackground` | `session-drawer.tsx` |
| new session | 14/500 · 22, r12, `#fff`, border `rgba(0,0,0,.12)`, 38 tall | same, 40 min | same |
| section label 工作区 | 14/400 · 20 `label-tertiary` | same | same |
| workspace group title | 14/400 · 20 `label-primary`, row 34 | same | same |
| session row title / time | 14/400 · 20 `label-primary` / 10/400 · 16 tertiary | same | same |
| row actions | 16×16, r4 | same, always visible (RN) | same |
| footer | 14/400 · 20, r12, 260×32 | same | same |
| search field | 13/400 · 18 | same | same |

### Session header and tabs

| Element | Web | Native | File |
| --- | --- | --- | --- |
| header title | 14/500 · 20 `label-primary` | same | `workspace-shell.tsx` |
| header icon button | 28×28, r8, 16 glyph | same (hit slop to 44) | same |
| tab | 13/500 · 16; active `link` with a 2px bar under the label that reaches 1px past the tab box; inactive tertiary | same bar as an absolutely positioned 2×2-radius view, no glyph (`.tab::after` draws text-only tabs) | `session-workbench.tsx` |
| tab strip | 25-row, 8px leading padding, 32px between tabs, hairline divider | same | same |

### Conversation

| Element | Web | Native | File |
| --- | --- | --- | --- |
| markdown body | 14/400 · 24, `p` margin 16, `ul` pad-left 18, `li+li` 6 | same | `native-markdown.tsx` |
| h1–h4 | 21/700·30 · 19/700·28 · 18/700·26 · 14/600·24; 32/16 and 16/0 margins | same | same |
| inline code | 12/400 · 19, r8, pad `0 5`, `rgb(250,250,250)`, hairline border | same | same |
| code block | r16, `specific-sidebar-fill`, banner 11/18 `9px 14px`, pre 11/19 pad 16 | same | same |
| user bubble | 14/400 · 22, `10px 16px`, r20, `specific-bubble`, ≤82% column | same | `app/session/[sessionId].tsx` |
| user time | 13/400 · 24 tertiary | same | same |
| assistant tail time | 12/400 · 24 tertiary | same | same |
| message actions | 28×28, r8, 6px padding, 15–16pt glyph, gap 8; order 复制 · 👍 · 👎 · 分支, assistant tail clock last | same order; ratings and branch render inside the strip | `native-message-feedback.tsx`, `app/session/[sessionId].tsx` |
| tool row | 13/400 · 24 tertiary verb + `·` + argument, dot 2×2 caption, chevron 14, row 24 | same | `native-tool-card.tsx` |
| tool payload | eyebrow 11/500 · 16, mono 11 · 16 | same | same |
| think row | 13/400 · 24 title, 13/400 · 20 summary, both tertiary | same | `native-conversation-status.tsx` |
| activity group | 14/400 · 24 tertiary, chevron 16 | same | same |
| process row | 14/400 · 24 label, 12/400 duration | same | `session-workbench.tsx` |
| retry row | 13/400 · 20 tertiary; detail label 13/400 · 18 secondary | same | `native-conversation-status.tsx` |
| turn error | 13/600 · 20 `state-error-primary`, message 13/400 · 20, code 11/400 · 16 | same | same |
| statistics | two 22-tall chips 12 apart in the composer dock, each a 14pt glyph (gauge / database) 6px before its 12/400 · 20 tertiary readings joined by `·` | same pills, one row that ellipsizes | `app/session/[sessionId].tsx` |
| 加载更早 | 12/400 secondary, `4px 12px`, r8, `rgb(241,243,245)`, 72×25 | same chip, 44 touch floor | same |
| attachment card | r16, `8px 10px`, gap 10, `rgb(250,250,250)`, icon 40 r10 | same | `native-message-attachments.tsx` |

Vertical rhythm is margins, not `gap`: adding a container `gap` in RN would
double every paragraph. The markdown wrapper therefore only clips overflow.

### Settings

| Element | Web | Native | File |
| --- | --- | --- | --- |
| nav cell | 14/400 · 22, `0 14px`, gap 8, r12, 40 tall | same | `app/settings.tsx` |
| sheet header | pad `20px 16px 0 10px`, gap 8; close 28×28 r8 | same | same |
| section heading | models/presets 16/500 · 24; plugins 18/600; connection 16/600 | same per section | same |
| section intro | models 14/400 · 22; others 13/400 | same | same |
| preference row | `16px 0`, gap 8; title 14/400 · 22; desc 12/400 · 18 tertiary | same | same |
| selector | 14/400 · 22, `0 14px`, gap 12, r12, `bg-overlay`, 36 tall, chevron 14 | same | same |
| switch | 36×20, track `label-primary`, thumb 16 | platform switch (RN) | same |
| theme cube | 115×68, `12px 6px`, gap 4, r20, selected `bg-overlay`, label 14/400 · 22 | same, flex-1 columns | same |
| read-only kv | key 13/400 secondary, value 13/400 primary, action 12/400 | same | same |
| preset card | name 15/600 · 21, id 11/400 · 21, desc 13/400 · 20, tag 11/500 · 17 | same | same |
| plugins card | title 14/500 · 20, desc 12/400 · 18, identity 12/400 · 18 secondary | same | same |

### Pickers and menus

| Element | Web | Native | File |
| --- | --- | --- | --- |
| menu item | 13/400 · 20, `6px 8px`, gap 6, r12, 34 tall | same type, 44 touch height | `native-list.tsx` |
| item description | 12/400 · 16 `label-caption` | same (`inkFaint`) | same |
| selected row | `bg-overlay` fill, check 14–20 | `accentSoft` fill + 20 check | `native-selection.tsx` |
| provider group | 14/500 · 22 (models page) | 12/600 group header (RN grouping affordance) | `native-model-selection.tsx` |

### Rename

| Element | Web | Native | File |
| --- | --- | --- | --- |
| title | 16/500 · 24 | 14/500 · 20 in the screen header | `.../rename.tsx` |
| input | 14/400 · 22, r16, `7px 14px`, border 1px | same | same |
| buttons | 14/400 · 22, r12, 36 tall | same (`NativeActionButton`) | same |

### Trajectory

The Web draws a timeline ruler over a 12/18 monospace ledger. The native client
keeps the conversation's typographic rhythm instead: 14/400 · 24 labels, 11/500 ·
16 state tags, and a markdown detail clipped to 96pt. This is a documented RN
deviation, not a pending fix.

### One interaction for every composer control

Every trigger in the composer's control row and dock opens the same surface:
`NativeMenuPanel` (or the pillar/meter panels built on the same
`NativeAnchoredPanel`). The Web portals each menu beside its trigger; a phone
anchors it to the bottom of the screen, because a floating panel would cover the
composer it belongs to and leave no outside area to tap.

| Control | Opens | Rows |
| --- | --- | --- |
| `+` | add menu | `添加`: 文件 · `指令`: 目标 / 权限 / 模式 / 模型 |
| 权限 | permission picker | the projection's presets with their shield glyph |
| 模式 | mode picker | Agent presets with their preset glyph |
| 模型 | model picker | provider groups, then 推理等级 for the selected model |
| statistics pill | 会话统计 | 模型用时 / 工具调用用时 / 首 token 平均 / 输出速度 |
| token pill | Token 用量 | 缓存命中 / 未缓存输入 / 缓存读取 / 输出 |
| context meter | 上下文已用 | segmented bar + 系统提示词 / 工具定义 / 对话消息 |

Picking a value closes the panel and commits in place: permission sends
`/permission <preset>`, mode submits `agent-preset`, and model submits
`session/model`. The three full-screen routes that used to serve those pickers
are gone — the panel is the only entry point, so a control never leaves the
conversation to change how the next turn runs.

`NativeMenuPanel` carries both row shapes: the pickers print a label over its
description, and the add menu prints a mono slash token beside the label.

## Interactive chrome — React Native's own

These deliberately do not copy the Web, per the agreed scope:

| Control | Web | Native |
| --- | --- | --- |
| Drawer | slide-over panel, hover-revealed row actions | `Drawer` with always-visible controls |
| Select / picker | anchored popover on `rgba(248,249,250,.58)` + blur | bottom sheet or a pushed screen |
| Dialog (rename) | 345×206 modal, r28 | a route screen with the same input metrics |
| Tooltip | hover-triggered | omitted; the control's label is its accessible name |
| Row actions | appear on hover | always rendered |
| Tab strip | 35 tall, wraps | 44 touch height, horizontal scroll |
| Long text | CSS `text-overflow` | `numberOfLines` + `ellipsizeMode="tail"` |
| Touch targets | 28–34 drawn | 28–34 drawn, hit slop to 44 |
| Trajectory | toolbar (时长 / 轮次 / 调用 / 子调用 + 搜索), a 输入 / 模型 / 工具 heat ruler, then a ledger of one-line mono cells | `verb · argument` rows at conversation sizes, each body a single truncated mono line |
| Turn statistics | pills above the composer | one centred line |
| Goal dock | bar above the composer | panel under the tab bar |

## Truncation

Every single-line label that can meet a narrow column uses `numberOfLines={1}`
with `ellipsizeMode="tail"`, plus `flexShrink: 1` / `minWidth: 0` on its row so a
long title shrinks instead of pushing a control out of the card. Applied to:
session row titles, header title, composer triggers, model rows, tool summaries,
the message action clock, and preset ids.

## Corrections in this pass

Each row was read from the Web census and applied to exactly one place (theme or
the screen), never both.

| Screen | Before | After | Web source |
| --- | --- | --- | --- |
| Composer access/mode labels | 13/500 `inkTertiary` | 13/500 `ink` | `InputBar` triggers, `label-primary` |
| Composer model label | 13/500 `inkTertiary` | 13/400 `inkMuted` | `ModelSelect .trigger` |
| Composer add control | 44×44 transparent, 21 glyph | 28×28 r999 `surfaceMuted`, 16 glyph | `InputBar .add` |
| Composer control row | gap 6, wrapped to a second line | gap 12, single row that scrolls | `InputBar .row` |
| Composer placeholder | one string for both surfaces | in-session `placeholder.default`, hero `placeholder.hero` | `ui-conversation` locales |
| Model trigger | name 13/400 `label-secondary` + effort 13/400 `label-caption` on one line, chevron caption | same split, effort shrinks first | `ModelSelect .triggerEffort` |
| Header title | 16/500 · 24 | 14/500 · 20 | `ConversationRoot .crumbs` |
| Session tab | 13/500 · 20, glyph + label | text-only 13/500 · 16 with the Web's 2px active bar | `.tab` / `.tabActive::after` |
| Drawer section label | weight 500 | 14/400 tertiary | `WorkspaceBrowser .sectionLabel` |
| Drawer search field | 14/400 · 18 | 13/400 · 18 | `zZw0qq_searchInput` |
| Settings nav cell | r10, `0 12px`, gap 6 | r12, `0 14px`, gap 8 | `.navCell` |
| Settings selector | r8, 32 tall, `0 10px`, 13/500 · 20 | r12, 36 tall, `0 14px`, 14/400 · 22 | `Jz5dnG_selector` |
| Settings preference row | `12px` vertical | `16px` vertical | `Jz5dnG_row` |
| Settings preset tags | 12/600, `0 7px` | 11/500 · 17, `0 8px` | `ui-agent-preset` tag |
| Settings panel heading | 16/600 everywhere | 16/500 · 24; plugins 18/600 | models / presets / plugins pages |
| Settings models intro | 13/400 · 20 | 14/400 · 22 | models page intro |
| Settings theme cube | r12, 64 tall, gap 6, 13/400 · 20 | r20, 68 tall, gap 4, 14/400 · 22 | `AppearanceRow .themeCube` |
| Menu / picker rows | 14/500 title, desc 12/18 `inkMuted` | 13/400 · 20 title, desc 12/16 `inkFaint` | `Menu.module.css .item` |
| Drawer new-session bar | one 14/500 line, white fill, r12, 38 tall, `8px 12px`, 16pt glyph | same, 40 floor | `SidebarRoot .newSession` |
| Drawer section header | 36 tall, controls 28×28 r8 with 16pt glyphs, 4px apart | same | `WorkspaceBrowser .sectionHeader` |
| Drawer workspace row | 34 tall, 16pt folder + 14pt chevron, 8px inline, r12 | same | `Rows .projectRow` |
| Drawer row time | relative (`刚刚`/`5分钟`/`1天`), 10/400 · 16 tertiary | same, via `formatRelativeSessionTime` | `ui-primitives relative-time.ts` |
| Message action boxes | 28×28 with a 15pt glyph | same, 8pt hit slop holds the 44pt target | `MessageIconActions .action` |
| User message time | 12/400 · 24 | 13/400 · 24 | `MessageItem .time` |
| 加载更早 | plain text | 12/400 secondary chip on `rgb(241,243,245)`, r8 | `ChatView` load-earlier |
| Rename input | 16, r8, hairline | 14/400 · 22, r16, 1px, `7px 14px` | `Rows.module.css .renameInput` |
| Interactions heading | 26/700 · 34 | 26/500 · 32 | `HeroShell` headline |
| Statistics | one centred wrapped line | the Web's separate left-aligned chips | `StatsPills` |
| Assistant tail time | led the row | follows the icons, `margin-left 8`, 12/24 | `.timeEnd` / `.endInfo` |
| Rating buttons | 44×44 boxes | 28×28 with 6px padding, 15pt glyph | `MessageIconActions .action` |
| Composer placeholder | `在这里输入消息…` | the Web's `发消息或创建任务, / 调用指令, @ 文件或对话` | `placeholder.default` |
| Drawer new-session bar | white card with a hint line under the label | one 14/500 line, white fill, 38 tall | `SidebarRoot .newSession` |
| Drawer section header controls | 44×44 with 21pt glyphs | 28×28 with 16pt glyphs, 36-tall header | `WorkspaceBrowser .sectionHeader` |
| Drawer workspace row | 36 tall, 18/20 glyphs, r12 | 34 tall, 14/16 glyphs, 6px gap | `Rows .projectRow` |
| Drawer session time | absolute date and clock | relative distance as the desktop prints it | `ui-primitives relative-time.ts` |
| Composer card | hairline border, side/top margins from the screen | r28 `surfaceRaised` card with `8px` top pad and the elevation shadow; controls inside the card | `InputBar .card` |
| Composer add control | 28×28 paperclip | 28×28 circle with the plus glyph on `surfaceMuted` | `InputBar .add` |
| Composer control row | two scrolling rows of chips | one row: add + glyph-only access/mode on the left, model + send on the right | `InputBar .row`, `.tools`, `.trailing` |
| Send glyph | stroked arrow | the Web's filled arrow path | `InputBar .primary` |
| Composer triggers | 8px padding, 13pt chevrons | `0 4px 0 8px`, 14pt glyphs, 28 tall | `PermissionSelect` / `ModelSelect .trigger` |
| Composer dock | statistics inside the composer stack | statistics + context meter on one centred row below the card | `InputBar .dock` |
| Statistics | one left-aligned line of wrapped chips, `输入 … 输出 …` | the Web's two pills with their glyphs, `·` separators, `N tok` totals | `StatsPills` |
| Statistics glyphs | text only | 14pt gauge / database glyphs 6px before each reading | `StatsPills` |
| Cache hit | integer rounded | integer, falling back to decimals so a near-full hit never reads 100 | `StatsPills.cacheHitPercent` |
| Context meter | absent | 14pt ring + reading in the composer dock | `ContextMeter` |
| Hero placeholder | `发消息或创建任务, …` | the hero's own `描述你想要构建的内容, …` | `placeholder.hero` |
| Dock pills | static chips | each pill opens the Web's detail panel | `StatsPills` + `stat-dialog.module.css` |
| Context meter | static reading | opens the composition panel; the bar follows the occupancy reading | `ContextMeter` |
| Add control | an alert-based picker | the Web's `添加` / `指令` menu | `ui-commands` |
| Context legend colours | absent | `meterSystem` / `meterTools` / `meterMessages` theme roles | `ContextMeter.module.css` |
| Panel scrim | absent | `panelScrim` theme role, softer than `overlay` | `--dsw-alias-bg-mask` |
| 权限 / 模式 / 模型 | navigated to a full-screen route | open in the same anchored panel as the dock controls | `PermissionSelect`, `ModelSelect` |
| Model picker | one flat list of models | provider groups, then the selected model's 推理等级 | `ModelSelect` root pane |
| Permission / mode copy | route header | panel heading | `Menu` / `PermissionSelect.trigger` |
| Assistant actions | copy · 👍 · 👎 · clock | copy · 👍 · 👎 · branch · clock | `MessageIconActions` |
| Message clock | `toLocaleTimeString`, so `9:24 PM` | 24-hour `HH:mm`, with the date prefix outside today and the year outside this year | `formatMessageClock` in `message-chrome.ts` |
| Tool duration | `0.1秒` / `0秒`, minutes split out above 60 | `96 毫秒` below a second, `1.50 秒` below ten, `79.0 秒` above | `formatDurationMs` in `TrajectoryTable.tsx` |
| Drawer close control | `navigation.closeDrawer()`, which the vendored drawer ignores | `CLOSE_DRAWER` dispatched against the drawer's own state key | `DrawerView`'s `handleDrawerClose` |
| Presets intro | one-sentence summary of what a preset is | the Web's `sectionIntro`: the plugin assembly the session's Agent runs on | `ui-agent-preset` locales `sectionIntro` |
| Presets grouping | one flat card list | a 12/500 `inkMuted` `内置` heading above the shipped presets | `ui-agent-preset` locales `builtInGroup` |

## Measured pass at 393 × 852 (2026-11-01)

The tables above are the census from the source CSS. This pass re-derived the
numbers from a running client on both sides and compared them element by
element, so a value is only "same" when something measured it.

**Reference side.** `@deepseek-ai/dsh@0.1.6-alpha.2` served with
`dsh web`, opened in Chromium through Playwright at `viewport 393×852`,
`deviceScaleFactor 2`, `isMobile`, `hasTouch`, `colorScheme light`,
`locale zh-CN`. `getComputedStyle` plus `getBoundingClientRect` for every
node that carries text, an aria-label, or is a control; the same walker writes
a PNG per screen. The onboarding overlay (`继续`, `稍后配置`) is dismissed
first, because it is the only screen the Web shows with no session behind it.

Every capture asserts the drawer is collapsed before measuring: a dimmed
`rgb(237,237,237)` centre pixel or a `rgb(245,246,247)` strip at x=5 means a
scrim or a partially open drawer is over the screen, and the colours sampled
from it are wrong by exactly that overlay. Two early captures of the settings
sections failed this assertion and were re-taken.

**Native side.** The release APK on a 1080×2344 `emulator-5554` at density 440
(2.75 device pixels per dp), paired to the same desktop over the mobile bridge.
`uiautomator dump` gives every text node's box in device pixels (÷ 2.75 = dp,
so a single-line label's box height is its line height); the PNG is sampled with
Pillow for the ink of each box, taking the mean of the darkest 1% of pixels. That
recovers the exact token value rather than an antialiased average — the samples
below landed on `rgb(15,17,21)`, `rgb(97,102,107)`, `rgb(129,133,140)`,
`rgb(173,178,184)`, `rgb(14,48,116)`, `rgb(65,118,230)` and
`rgb(228,237,253)` to the unit.

### Workspace home

| Element | Web (computed) | Native (measured) | Verdict |
| --- | --- | --- | --- |
| hero headline | 26/500 · 32, `rgb(15,17,21)` | 32.0 line box, `rgb(15,17,21)` | same |
| 预览版 badge | 12/500 · 18, `rgb(14,48,116)` on `rgb(228,237,253)`, 52×21 | 20.4 line box, `rgb(14,48,116)` on `rgb(228,237,253)` | same |
| workspace picker label | 13/500 · 20, `rgb(15,17,21)`, 28 tall | 19.3 line box, `rgb(15,17,21)` | same |
| mode trigger label | 13/500 · 20, `rgb(15,17,21)` | `rgb(15,17,21)` under a 0.5 row opacity | label same; see the note below |
| composer input | 14/400 · 24, 291×52 | 52.0 box | same |
| composer placeholder | `rgb(173,178,184)` | `rgb(173,178,184)` | same |
| send control | 34×34 r999, `rgb(255,255,255)` on `rgb(65,118,230)` | 34 dp circle, same pair | same |

The Web keeps the hero's mode and model triggers enabled and lets them set the
defaults a new session starts from; this client has no wire call for a session
default, so it dims them (`disabledControl`, opacity .5) and says why in the
accessibility label. The 0.5 sample above is that state, not a colour token.

### Drawer

| Element | Web (computed) | Native (measured) | Verdict |
| --- | --- | --- | --- |
| 新会话 header | 14/500 · 22 | 22.2 line box | same |
| section label 工作区 | 14/400 · 20, `rgb(129,133,140)` | 20.0 box, `rgb(129,133,140)` | same |
| workspace row title | 14/400 · 20, `rgb(15,17,21)`, 34 tall | 20.0 box on a 34 dp row | same |
| session row | 14/400 · 20 | 20.0 box | same |
| column | 280 wide, `rgb(249,250,251)` | `min(280, 92vw)` as a dp value | same |

### Settings — 通用设置

| Element | Web (computed) | Native (measured) | Verdict |
| --- | --- | --- | --- |
| nav cell label | 14/400 · 22, `rgb(15,17,21)` | 22.2 line box, `rgb(15,17,21)` | same |
| row title | 14/400 · 22 | 22.2 line box | same |
| row description | 12/400 · 18, `rgb(129,133,140)` | 18.2 box, `rgb(129,133,140)` | same |
| value selector | 14/400 · 22 on `rgb(245,246,247)`, 36 tall, r18 | 36 dp tall, `rgb(245,246,247)` | same |
| 语言 value | an enabled selector, `rgb(15,17,21)` | dimmed `rgb(109,110,113)` | deliberate: one locale ships, so the row is `disabled` |
| theme cube | 109×84, r20, selected on `rgb(245,246,247)` | 70.9 dp tall columns | same |

### Session conversation

| Element | Web (computed) | Native (measured, after the fix) | Verdict |
| --- | --- | --- | --- |
| header title | 14/500 · 20 | 20.0 line box, `rgb(15,17,21)` | same |
| tab label | 13/500 · 16 | 16.0 line box | same |
| active tab | `state-business-primary` = `rgb(65,118,230)` | `rgb(65,118,230)` | **fixed** — was `accentText` `rgb(30,64,175)` |
| inactive tab | `label-tertiary` `rgb(129,133,140)` | `rgb(129,133,140)` | same |
| markdown body | 14/400 · 24 | 24.0 line boxes | same |
| bullet glyph | `label-secondary` `rgb(97,102,107)` | `rgb(97,102,107)` | same |
| message actions | 28×28, glyph tone `label-secondary` | 28 dp boxes, copy / 👍 / 👎 `rgb(97,102,107)` | **fixed** — the branch glyph was `inkTertiary` `rgb(128,132,139)`, one step lighter than its own row |
| assistant tail clock | 12/400 · 24 tertiary | `rgb(129,133,140)` | same |
| composer placeholder | `rgb(173,178,184)` | `rgb(173,178,184)` | same |
| composer model effort | 13/400 `label-caption` | `rgb(173,178,184)` | same |

### Settings — 内置插件

| Element | Web (computed) | Native (measured) | Verdict |
| --- | --- | --- | --- |
| page heading | 18/600, 25 line box | 26.2 line box | same |
| page intro | 13/400, `label-tertiary` | 40dp two-line block = 2 × 20 | same |
| section label | 12/500 · 18, `label-secondary` | 17.8 line box | same |
| namespace row | name + status line | name 20.0, status 19.3 line boxes | same |
| search field, 会话插件 / 全局插件 groups, per-group counts | present | absent | scope: this client cannot install or edit plugins, so it lists the configuration namespaces the desktop loaded and says so in the intro |

### Settings — Agent 预设

| Element | Web (computed) | Native (measured) | Verdict |
| --- | --- | --- | --- |
| page heading | 18/600 | 24.0 line box | same |
| page intro | 13/400, `label-tertiary` | 40dp two-line block | same |
| 内置 group heading | 12/600, 17 line box, `label-tertiary`, `.06em` tracking (`AgentPresetSection.module.css .groupHead`) | 18.2 line box, `rgb(129,133,140)` | **fixed** — was `label-secondary` at weight 500 with no tracking |
| card name | 15/600 · 21 | 21.1 line box | same |
| card 内置 tag | 11/500 · 17, tertiary, pill | 19.3 box incl. 1pt padding | same |
| card 新任务默认 tag | 11/500 · 17, `on-brand` on `brand` | same pair | same |
| card description | 13/400 · 20, `label-secondary` | 40dp two-line block = 2 × 20 | same |
| card id | 11/400, tertiary | 21.1 line box on the name row | same size and tone; the id rides the name line instead of its own |
| card height | 157 | 97.8 | the Web card carries a 查看 / 复制 action row that this card replaces with a single pressable body; card actions are interactive chrome, which follows RN |

### Composer pickers and the add menu

| Element | Web (computed) | Native (measured) | Verdict |
| --- | --- | --- | --- |
| select row label | 14/400 · 22, `label-primary` (仅可查看 / 工作区内修改 / 完全权限) | 22.2 line box | **fixed** — was 13/400 · 20 |
| select row description | 14/400 · 22, `label-tertiary` | 22.2 line box | **fixed** — was 12/400 · 18 |
| select row pitch | 40 | 40 min height | same |
| command menu row label (添加 · 文件 / 权限 / 模型) | 13/400 · 20 (`Menu.module.css .item`) | 20.0 line box | unchanged by the fix |
| command menu token | mono, tertiary | 20.0 line box, tertiary | same |
| command menu description | 12/400 · 18, tertiary | 18.2 line box | same |
| panel title | 14/400 · 22 in the Web's select popover | 14/500 · 22 | same size; the native panel title keeps the 500 weight the rest of its sheet headers use |
| panel surface | white, r20, 4px padding | `surfaceRaised`, r12, 6/8 padding | interactive chrome: an anchored popover on the Web, a bottom sheet here |

### Trajectory

| Element | Web (computed) | Native (measured) | Verdict |
| --- | --- | --- | --- |
| active tab | `rgb(65,118,230)` | `rgb(65,118,230)` | same (after the tab fix) |
| timeline entry label | 12/18 mono ledger | 14/400 · 24, tertiary | documented deviation: the native timeline keeps the conversation's rhythm |
| turn heading | 12/18 | 14/400 · 28 secondary (第 1 轮) | documented deviation |
| detail body | 12/18 mono | 14/400 · 24 | documented deviation |

### What this pass changed

| File | Change | Why |
| --- | --- | --- |
| `src/components/session-workbench.tsx` | `tabTextActive` `accentText` → `accent` | the Web's active tab is the same `state-business-primary` as the 2pt bar it sits on; a lighter tone split the label from its own indicator |
| `app/session/[sessionId].tsx` | branch glyph `inkTertiary` → `inkMuted` | the other three actions in the same strip are `inkMuted`; one lighter glyph read as disabled |
| `app/settings.tsx` | presets group heading: `inkMuted`/500 → `inkTertiary`/600 with 0.72 tracking | `.groupHead` is 12/600 in `label-tertiary`; the native copy claimed 12/500 in `label-secondary` in its comment and drew that instead |
| `src/components/native-menu-panel.tsx`, `src/components/workspace-composer.tsx` | new `rowRole` prop: the permission / mode / model panels render 14/400 · 22 rows (label `ink`, description `label-tertiary`) instead of the command menu's 13/400 · 20 | the Web's select lists print their rows at 14/22 (`仅可查看` / `工作区内修改` / `完全权限` measure 14/400 · 22 on a 40pt pitch), while `Menu.module.css .item` — the add menu and `/`-command rows — stays 13/20 |

The first two were re-measured on the rebuilt APK: the tab reads
`rgb(65,118,230)` and the branch glyph `rgb(96,101,106)` beside its
`rgb(97,102,107)` siblings. The select-row change was re-measured on the rebuilt APK too: the model and
permission panels now print 22.2pt line boxes for both the label and its
description, while the add menu's 文件 / 权限 / 模型 rows still measure 20.0 and
18.2 as `Menu.module.css .item` specifies.

## Re-baselined on 0.2.2-alpha.2 (2026-11-01)

The numbers above were read from the shipped `0.1.6-alpha.2` client. The
desktop has since moved to `0.2.2-alpha.2`, so the same walker was re-run
against a locally built `0.2.2-alpha.2` client at 393×852 and every value the
native client copies was compared again. The design system underneath barely
moved: of 92 semantic colour roles only one changed value, 27 roles were added,
and one was removed. Radii, the type scale, and the composer metrics are
unchanged apart from the two entries below.

### Colour roles added by 0.2.2

Read from the running client (`getComputedStyle(body).getPropertyValue`) in
both appearances, then projected into `src/theme/index.ts`:

| Role | Light | Dark |
| --- | --- | --- |
| `menuIcon` | `rgb(53,54,56)` | `rgb(235,238,242)` |
| `codeDiffAdded` | `rgba(34,197,94,.08)` | `rgba(34,197,94,.12)` |
| `codeDiffDeleted` | `rgba(236,19,19,.08)` | `rgba(242,90,90,.12)` |
| `fileDiffAddedBg` / `Gutter` / `Marker` | `rgb(230,244,231)` / `rgb(237,247,237)` / `rgb(1,162,65)` | `rgb(31,49,36)` / `rgb(19,32,22)` / `rgb(65,201,119)` |
| `fileDiffDeletedBg` / `Gutter` / `Marker` | `rgb(252,230,226)` / `rgb(253,236,233)` / `rgb(186,39,35)` | `rgb(60,31,27)` / `rgb(40,19,14)` / `rgb(250,66,62)` |
| `stateDone` | `rgb(124,58,237)` | `rgb(167,139,250)` |
| `settingsCardFill` / `settingsCardStroke` | `rgb(255,255,255)` / `rgba(0,0,0,.16)` | `rgb(44,44,46)` / `rgba(255,255,255,.2)` |
| `textSelection` | `rgba(59,130,246,.4)` | `rgba(59,130,246,.4)` |
| `labelShimmer` | `rgba(0,0,0,.3)` | `rgba(255,255,255,.45)` |

`specific-menu` also became a translucent surface (`rgba(252,253,254,.70)`
light, `rgba(48,49,54,.64)` dark). Native menus stay opaque on purpose: a phone
anchors them to the bottom sheet over content it must occlude, so a translucent
fill would leak the conversation through the menu. The token is recorded here
rather than applied.

### Values the native client had to correct

| Element | 0.1.6 value | 0.2.2 value | Native fix |
| --- | --- | --- | --- |
| Composer input | 14/400 · 24 | **16/400 · 24** | already 16 (`workspace-composer.tsx`) |
| 预览版 badge radius | 24 | **999 (pill)** | already `radius.pill` |
| Access / mode / model trigger radius | 16 / 24 | **8** | already `radius.control` |
| Settings value selector | r18, 68 wide | **r12, content width, 36 tall** | already `radius.md` / 36 |
| Rail icon button | 28×28 r12 `label-primary` | **28×28 r8 `label-secondary`** | drawer icons already `inkMuted` + `radius.sm` |
| Drawer row action square | 20×20 | **24×24, 16pt glyph** | `rowAction` raised to 24 (`session-drawer.tsx`) |

Measured on the rebuilt APK: the row action now renders `66×66` device pixels =
24 dp, was `55×55` = 20 dp.

### Session screen

Read from the same 0.2.2 client with a real conversation open:

| Element | Web (computed) | Native (measured) | Verdict |
| --- | --- | --- | --- |
| header title | 14/500 · 20, r12 hit box | 20.0 line box | same |
| active tab | 13/500 · 16, `rgb(65,118,230)` | `rgb(65,118,230)` | same |
| inactive tab | 13/500 · 16, `label-tertiary` | `rgb(129,133,140)` | same |
| message actions | 28×28, r8, glyph `label-tertiary` | 28 dp squares, glyph now `inkTertiary` | **fixed** — the cluster was `inkMuted` |
| code-block copy | 24×24, glyph `label-secondary` | 24 dp, `inkMuted` | same |
| 加载更早 | 72×25, 12/400, `rgb(241,243,245)`, r8 | same chip on a 44 touch floor | same |
| turn status | 14/400 · 24, `label-tertiary` | same | same |
| markdown h2 | 19/700 · 28 | same | same |
| code block | 11/19 | same | same |
| assistant tail clock | 12/400·24 tertiary (`secondary − 1`) | 12/400 · 24 | same |

`MessageIconActions.module.css` sets the shared action row to
`--dsw-alias-label-tertiary` and lets the icons inherit it, so the copy, the two
ratings, and the branch glyph all rest in the tertiary tone; only the in-code
copy button, at 24×24, uses the secondary tone. The native cluster now matches
that split.

The goal bar under the tabs has no Web counterpart: the desktop renders goal
state inside the turn process rows, so the phone's `执行中` banner with its
pause / edit / clear controls is native chrome and keeps its own metrics.

### Settings and composer dock

| Element | Web (computed) | Native (measured) | Verdict |
| --- | --- | --- | --- |
| section tab | 108×40, r12; active fill `rgb(235,238,242)` (`bg-layer-1`), idle transparent; label 14/400 · 22 | 40 tall, r12; active fill now `rgb(235,238,242)` | **fixed** — the active tab used `surfaceMuted` `rgb(245,246,247)` |
| section heading | models/presets 16/500 · 24; plugins 18/600 | 24.0 / 26.2 line boxes | same |
| section intro | 13–14/400, `label-tertiary` | `rgb(129,133,140)` | same |
| value selector | 36 tall, r12, `bg-overlay` | 36, r12, `surfaceMuted` | same |
| statistics pill | 126×22 r8, text 12/400 · 20 `label-tertiary` | 21.8 line box, `rgb(128,132,139)` | same |
| token pill | 139×22 r8, 12/400 · 20 tertiary | 22 line box, same tone | same |
| context meter reading | 64×22, 13/400 · 20 tertiary | 22 line box, `rgb(129,133,140)` | same |

The settings tab was the one settings-surface drift: the desktop fills the
current section with `bg-layer-1` (235,238,242 in light, 67,69,74 in dark), one
step above the panel, while this client painted `surfaceMuted` (245,246,247),
which is the *hover* tone. Measured after the fix on the rebuilt APK: the active
tab samples `(235,238,242)` and the idle tabs stay `(255,255,255)`.

### Menus, pickers, rename and trajectory

| Element | Web (0.2.2) | Native (measured) | Verdict |
| --- | --- | --- | --- |
| menu row | `.item`: `6px 8px`, r12, 13/400 · 20 `label-primary`, min-height 34 | 13/400 · 20 `ink`, 44 touch floor | same type and metrics |
| menu row selected | `selectedFill` = `interactive-bg-hover`, no accent tint | `interactiveHover` | **fixed** — was `accentSoft` |
| menu row disabled | `.item:disabled` dims the whole row to opacity .4 and leaves the label on `label-primary` | row `opacity 0.4`, label `ink` | **fixed** — recolouring the label to `inkFaint` inverted the title/description hierarchy |
| rename input | 44 tall, r16, `7px 14px`, 14/22, **0.5px** `border-l4` | 44 dp, r16, `7px 14px`, 14/22, hairline | **fixed** — the outline was 1 px |
| trajectory row | ruler plus a 12/18 mono ledger | 14/400 · 24 labels, 11/500 · 16 state tags | documented RN deviation |
| trajectory state tag | `label-tertiary` | `rgb(129,133,140)` | same |
| trajectory duration | tertiary | `rgb(129,133,140)` | same |

The disabled-row fix needed a second pass. Dimming the label to `inkFaint` made
a locked row's description (`label-tertiary`, 129,133,140) read darker than its
title (173,178,184). Sampling the rebuilt APK now shows the title at
`(159,160,161)` and the description at `(205,206,209)`: the 0.4-dimmed
`label-primary` over the dimmed caption, which is the desktop's own hierarchy.

### Surfaces 0.2.2 added that this client does not implement

The desktop gained a version badge (`0.2.2-alpha.2-<commit>-<dirty>`), keyboard
hint glyphs (`⌥ ⌘ N`), `自动化任务` / `更多` / `分栏` entries, an account menu
that now owns `设置`, and a review panel with diff colours. These are features,
not styling drift: the tokens they need are in the theme above, so implementing
one later does not require another colour pass.

## Surfaces added after the styling pass (2026-11-01)

Three of the surfaces listed above as unimplemented are now drawn. Their values
come from the same sources the rest of this document uses, so nothing here is a
new colour decision.

### Session-log export

The row menu's second entry (`导出日志`, between 重命名 and 分叉会话) uses the
desktop's `IconDownloadOutline16` artwork, so the menu's item metrics are
unchanged: 16px glyph, `inkMuted`, 13/22 label, 0.4 opacity when disabled. The document it writes is Markdown with `#` for the session title and
`###` per row, matching the desktop's conversation distinctions:

| Row | Rendered as | Source |
| --- | --- | --- |
| User / assistant prose | `### 用户` / `### 助手` and the text | `ConversationNode` role headings |
| Think | `<details><summary>思考过程</summary>` | the desktop's collapsed Think block |
| Tool call | `### 工具 · <name>`, a 状态 line, then 输入 / 输出 fences | `ToolRow`'s summary + body |
| Command | `### 命令 · <name>` with 成功 / 出错 / 运行中 | `terminalBlockLabels` |
| Retry, turn error, token cut-off, compaction | one section each | the conversation's own rows |

Fences widen when the payload already contains a backtick run, so a tool result
that prints Markdown cannot close its own block early.

### File-change diffs

A file mutation shows its change instead of its raw arguments, as the desktop
does. Values are the desktop's (`DiffBlock.module.css`), read at 393×852:

| Part | Desktop | Native |
| --- | --- | --- |
| Added line background | `--dsw-alias-code-diff-added` | `codeDiffAdded` |
| Removed line background | `--dsw-alias-code-diff-deleted` | `codeDiffDeleted` |
| Gutter bar | `inset 3px 0 0` on state success/error | 3px left border, `success` / `danger` |
| Added / removed text | `state-success-primary` / `state-error-primary` | `success` / `danger` |
| Context text | `label-secondary` | `inkMuted` |
| Path | `label-secondary`, weight 500 | `inkMuted`, Menlo 11/16, weight 500 |
| Line type | `--dsw-font-markdown-code-block` (11/19) | Menlo 11/19 |
| Line padding | `0 22px` | `paddingHorizontal: 22`, 1px vertical |

Measured on the emulator (1080×2344, density 440) after the fix, against the same
roles read from `design-platform.css`:

| Part | Desktop role | Desktop value | Native sample |
| --- | --- | --- | --- |
| Added line text | `state-success-primary` | `rgb(34, 197, 94)` | `(34, 197, 94)` |
| Removed line text | `state-error-primary` | `rgb(236, 19, 19)` | `(236, 19, 19)` |
| Added tint | `code-diff-added` 8% | green over white | `(229, 242, 235)` |
| Removed tint | `code-diff-deleted` 8% | red over white | `(245, 228, 229)` |
| Path | `label-secondary` | `rgb(97, 102, 107)` | `(97, 102, 107)` |
| Line counts | `label-tertiary` | `rgb(129, 133, 140)` | `(129, 133, 140)` |

The first implementation used `fileDiffAddedMarker`/`fileDiffDeletedMarker`
(`rgb(1, 162, 65)` / `rgb(186, 39, 35)`). Those roles belong to the file-diff
panel's own markers, not to `DiffBlock`, so the line text came out darker than the
desktop's. `DiffBlock.module.css` draws the tint from `code-diff-*` and the gutter
bar and text from `state-*-primary`; the native block now does the same.

The one deliberate difference: the desktop scrolls a diff horizontally and offers
a wrap toggle; a phone wraps, because a 393pt column has no room for both a
gutter and a horizontal scroll that hides the end of the line.

### Release line

`当前版本：<version>` sits at the end of General settings in `12/18` `inkTertiary`,
the desktop's `CurrentVersionRow.module.css .row` metrics, and is hidden rather
than blanked when the manifest carries no version.


## Two-client pass (2026-11-02)

Every earlier table read the Web from a source build. This pass compared the two
running clients side by side: the installed desktop runtime (`dsh web` from the
app's bundled `runtime/cli`, which serves the same client the Electron window
renders) captured with Playwright at 393 × 852, against the release APK on a
1080 × 2344 emulator (density 440, so 1 dp = 2.75 device pixels) dumped with
`uiautomator`. Colours were sampled from PNG pixels; geometry came from
`uiautomator` bounds and CSS `getBoundingClientRect`.

### Drawer

| Element | Desktop | Native before | Native after |
| --- | --- | --- | --- |
| Frame width | 280 (`Fzx91q_root`) | 320 | 280 |
| Fill | `rgb(249, 250, 251)` (`--dsw-static-neutral-bluish-50`) | `rgb(245, 246, 247)` | `rgb(249, 250, 251)` |
| Mask over the frame | `rgba(0, 0, 0, .24)` (`bg-mask-1`, sampled 194,194,194 over white) | `rgba(0, 0, 0, .45)` (sampled 140,140,140) | `rgba(0, 0, 0, .24)`, sampled 194,194,194 |
| Close control | 28 × 28, r8, 16pt glyph at 244,22 | 44 × 44, 22pt glyph at 264,36 | 28 × 28, r8, 16pt glyph |
| New-session bar | 256 × 38 at x12, r12, 14/500 · 22 | 296 × 40 | 256 × 38 at x12 |
| Section label | x19, 14/400 · 20 tertiary | x16 | x20 |
| List column | rows 264 wide at x8, `0 8px 0 9px` | rows 271 wide at x4 | rows 264 wide at x8, `0 9px 0 8px` |
| Dark fill | `rgb(27, 27, 28)` (`neutral-bluish-900`) | `rgb(35, 35, 36)` | `rgb(27, 27, 28)` |
| Workspace row | a 16pt folder glyph in the leading slot; open/closed artwork and the accent fill carry the state | a 14pt chevron plus the folder, which shifted the name 26pt right | folder glyph only |
| Session row | always a 16pt slot (`StateDot` ring in `label-tertiary` while running) and the relative stamp in the trailing cell | the slot existed only when a search snippet did, and `处理中` replaced the stamp | slot on every row, 14pt ring while running, stamp always |

The phone's drawer also carries one control the desktop has no need for: a 44pt
square **sync** button beside 设置 (same border, 12 radius, 16pt
`refresh-outline`). The desktop shares one process with its session log, so it
never needs a manual re-read; the phone reads through the mobile gateway, where a
dropped SSE connection leaves the list frozen until the app restarts. The button
bumps `generation` in `state/mobile-sync`, which makes the bridge effect tear
down the stream and open a new one, then invalidates `session-list` and every
per-session cache. Its `syncing` flag lives in the transport store rather than in
component state, because restarting the stream can remount the drawer content,
and the spinner stays up for at least `SYNC_FEEDBACK_MS` so the tap never reads
as ignored.

### Session header and tabs

| Element | Desktop | Native before | Native after |
| --- | --- | --- | --- |
| Header padding | `10px 28px 0 20px`, 30pt content row | 8/12 vertical/horizontal, 36pt row | `10px 28px 0 20px`, 30pt row |
| Title start | x55 (20 pad + 28 toggle + 7) | x76 (a 20pt whale sat between) | x48 |
| Header mark | none in a session | 20pt whale | none |
| Tab pitch | 58 (46pt box + 12 gap): 对话 10–56, 轨迹 68–114 | 78 (46 + 32) | 54 (46 + 12) |

The desktop's tab box is 46 wide with 10pt inline padding and the strip's leading
padding is compensated by a −10 margin, so the first label lands at x20 in both
clients.

### Conversation screen

| Element | Desktop | Native before | Native after |
| --- | --- | --- | --- |
| Access / mode triggers | 44 × 28 (glyph + chevron, label hidden below a 460pt row) | squeezed to 13 × 28 and the chevron clipped once the model name grew; the label-holding model trigger never shrank | 44 × 28 each; the model trigger gives way and ellipsizes its name |
| Turn-error code | the projection carries none | drawn beside the message, squeezed to a 41 × 8 strip at the row's trailing edge | drawn under the message, 335 × 16 |
| Turn-error title | 13/600 · 20 | clipped to a 286 × 12 box by that strip | 335 × 20 |

The composer row was the conversation's one layout bug: `tool` carried
`flexShrink: 1` for every trigger and `trailing` carried `flexShrink: 0`, so a
long model name (217pt for `intl/deepseek-v4.1-flash · high`) took its width from
the two icon triggers instead of from itself.

### Whole-Turn folding

The desktop folds a settled Turn's steps, retries, and commands behind one
control and leaves the Assistant's replies in place; the phone printed a
disclosure per step, so a long Turn read as a wall of `执行了命令` headers. The
native list now folds the same way: one `turn:*` row per settled Turn,
positioned where that Turn's first process row was, absorbing every step group,
retry, command, and token-limit notice in its sequence span. Replies stay
outside it, in their original order.

| Part | Desktop (`TurnProcessNodeView.module.css`) | Native |
| --- | --- | --- |
| Control row | 33 tall, `padding: 0 0 8px`, `border-bottom: 0.5px solid border-l2` | `minHeight 33`, `paddingBottom 8`, `StyleSheet.hairlineWidth` in `borderL2` |
| Label | `label-tertiary`, 14 on a 24 line, ellipsized | 14/24 `inkTertiary`, `numberOfLines={1}` |
| Chevron | 14, 4 left of the label, rotated 180° when open | `chevron-down-outline` / `chevron-up-outline`, 14, 4 gap |
| Leading glyph | none | none — the check and warning marks are gone |
| Failed or stopped Turn | control disabled and its content left open (`turnProcessAlwaysOpen`) | `locked`: content always open, no chevron, no press |
| Label copy | `已完成，用时 8分52秒` / `处理失败` / `已停止` with `小时 分 秒` units | `turn.took` / `turn.failed` / `turn.stopped`, same duration shape |

A Turn with no end sequence is still running, so its rows never land in a
settled span and keep the live per-step headers that name what the agent is
doing.

### Trajectory

The ledger now prints one truncated line per row, at the desktop's
`Trajectory.module.css` cell metrics (12/18 mono, `label-tertiary`), instead of
a full Markdown body clipped at a fixed 96pt: that wrapper cut rows mid-line and
let one row's text run into the next.

| Part | Desktop | Native |
| --- | --- | --- |
| Row body | one truncated mono cell per row | `trajectoryDetailPreview` collapses the Markdown to one line; `numberOfLines={1}` truncates it |
| Row separator | hairline between ledger rows | `traceBody` bottom hairline |
| Row label | `label-primary` at the row's own size | 14/22 `ink` |

### Model picker

The catalog this client receives carries every provider the desktop routes to —
four providers and several hundred models here — and the old menu printed all of
them as one flat list under an effort group at the very bottom. Three changes:

| Problem | Change |
| --- | --- |
| Route ids such as `cline/nvidia/nemotron-3.5-lighting-free` filled the row and truncated mid-word | the row title is the route's last segment; the dropped segments print under it in mono tertiary, so `nemotron-3.5-lighting-free` / `cline/nvidia` reads as a name with its provenance |
| hundreds of rows with no way to narrow them | a search field filters on the id, the display name, and the provider name, and a provider chip row narrows to one provider |
| the reasoning levels sat below the last model | they are a chip row above the list, next to the search field |
| the selected model was somewhere in the middle of the list | it is pinned under `当前` while the query is empty |
| a long route put the model name and its provider on two lines | one line: the name, then `provider · subpath` in tertiary on the same row, truncating the provenance first |
| the current model was not visibly marked | `current` is computed per row and drives an accent-soft fill, an accent title, a 16pt check, and a `当前使用中` accessible name |

The sheet also lifts by the reported keyboard height: its modal window is its own
surface, so the activity's `adjustResize` never moved it and the search field
would sit under the keyboard.

### Settings: 内置插件

The desktop page is a plugin inventory: an 18/600 heading, a 13/18 tertiary
intro, a 36pt search field, a group header with a preset switcher, and one
20-radius card per plugin carrying a 14/500 title, a 12/18 description, a mono
identity chip, and a state tag.

This client cannot read the inventory — the bridge exposes settings namespaces,
not the host's plugin metadata — so the page lists namespaces. It now keeps the
desktop's anatomy around that different data:

| Element | Desktop (`k8jdEW_*`) | Native |
| --- | --- | --- |
| Page gutters | 16pt, 12pt between heading, intro, and catalog | `pluginList` |
| Heading | 18/600 | `panelTitleWide` (unchanged) |
| Intro | 13/18 `label-tertiary` | `pluginIntro` |
| Search | 36 tall, 12 radius, hairline `border-l4` on layer 1, glyph 12 in, 13px input | `pluginSearch`; filters on the localized label and the namespace |
| Group title | 14/400 primary on a 22px line | `pluginGroupTitle` |
| Group sub-line | 12/18 tertiary | `pluginGroupSub` |
| Card | 20 radius, hairline `settings-card-stroke`, `min-height: 52`, padding 12/14 | `pluginCard` |
| Card title | 14/500 on 20 | `pluginCardTitle` |
| Identity chip | mono 12/18 secondary on `surfaceMuted`, 4 radius, 1px 6px padding, 6pt above | `pluginCardIdentity`; hidden when it would repeat the title |
| State tag | 11/500 on 17, 1px 8px, pill, `surfaceMuted` | `pluginCardTag` carries `实时生效` / `重启生效` |

### Settings: Agent 预设

The desktop card is a 20-radius surface whose main block is padded 14/16/12 and
whose footer sits under a hairline: two 12/22 ghost actions (`模式说明`,
`如何使用`) and a 28pt icon button. The native card had a 14 radius, one 14pt
pad, and no footer.

| Element | Desktop (`XzvN5G_*`) | Native |
| --- | --- | --- |
| Intro | the desktop's own copy, 13/18, two lines | `settings.presetsIntro` |
| Card | 20 radius, hairline stroke, `settings-card-fill`; the default card takes `surfaceMuted` | `presetCard` |
| Main block | 14px 16px 12px, 12pt gap | `presetMain` |
| Footer | hairline top, 6px 10px, 36pt actions, 4pt gap | `presetFoot` |
| Footer actions | 12/22 tertiary | `模式说明` opens the preset document; `如何使用` shows the desktop guide's opening paragraph in a dialog |
| Shipped tag | outlined pill, not a filled one | `presetTag` |
| Detail icon | document glyph | `chevron-right-outline`, the native affordance for "opens a page" |

The desktop's 如何使用 guide is four sections of curated Markdown per shipped
preset. This client shows only its opening paragraph, so the dialog never claims
the full guide.

### Settings: 模型 and 桌面端连接 stay different on purpose

The desktop's 模型 tab is credential management: provider cards with 编辑 /
删除 and a dashed 添加模型提供商 row, under a 16/500 heading with a 14/22 intro.
This client receives no keys, so the tab keeps its own job — choosing the
default model for new sessions — and already matches those type values. The
桌面端连接 tab has no desktop counterpart at all: it shows the gateway address
and the paired device.

### Still different

These are visible and not yet changed; each needs a decision, not a measurement.

| Surface | Difference |
| --- | --- |
| Drawer brand | desktop prints `DSH 本地构建` over a 6pt `0.2.2-alpha.2-<commit>-<dirty>` badge; the phone prints the product wordmark. The phone has no access to the desktop's build string. |
| Drawer entries | `插件` / `自动化任务` / `更多` (three 36pt rows between the new-session bar and the workspace list) have no phone destination. |
| Workspace rows | the phone draws a disclosure chevron the desktop reveals on hover; it shifts the folder and title 26pt right. |
| Hero | the desktop centres the headline and composer in the body; the phone pins the composer to the bottom above the home indicator. |
| Session header | the desktop prints a model split-control and a `•••` menu (rename / fork / export); the phone prints a `处理中` chip and reaches those actions from the drawer row's `⋯`. |
| Tabs | the desktop offers 对话 / 轨迹 / 统计 / •••; the phone has the first two. |
| Trajectory toolbar | the desktop prints 时长 / 轮次 / 调用 / 子调用 with a search field above the lanes; the phone lists rows only. |
| Trajectory ruler | the desktop draws an input/model/tool heat ruler with a playhead; the phone has no ruler. |
| 统计 tab | the desktop's third tab shows the turn statistics panel; the phone reaches the same numbers from the dock pill. |
| Message usage | the desktop prints a `用量 5M tok` pill in the action row; the phone's projection carries no per-message token count. |
| 内置插件 data | the desktop reads the host's plugin inventory (title, description, preset column, disabled state); the bridge exposes settings namespaces only, so the phone lists those with the same card anatomy. |
| 模型 tab job | the desktop manages provider credentials (编辑 / 删除 / 添加模型提供商); the phone sets the default model for new sessions and cannot receive keys. |

## Workspace, composer and app identity (2026-11-02)

### Workspace home

The desktop home is a hero block plus two ghost buttons, not a form. The phone
had a `当前会话` label, a bordered 44pt session field, and a `最近更新` status line
the desktop never shows.

| Element | Desktop (`_wOI4G_*`, `T_XHFG_*`) | Native before | Native after |
| --- | --- | --- | --- |
| Hero | mark + \\`探索未至之境\\` 26/500 (32pt row inset 24) + \\`预览版\\` pill | only while no session was selected, 40pt mark | always shown, 26pt mark, 32pt row inset 24 |
| Workspace/mode row | \\`FQzohq_heroWorkspaceRow\\`: two 28pt ghost buttons, 8pt radius, 0 8 padding, 13/500 | 44pt bordered controls behind a \\`当前会话\\` label | same 28pt ghost shape, label and status line removed |
| Status line | none | \\`最近更新 · …\\` | removed |

### Composer keyboard action

The desktop sends on Enter. The phone had \\`submitBehavior: 'newline'\\`, so the
keyboard's confirm key inserted a newline and a prompt could only be sent by
tapping the send button. \\`composerInputPolicy\\` is now
\\`{ returnKeyType: 'send', submitBehavior: 'submit' }\\`, and the field calls
\\`send()\\` from \\`onSubmitEditing\\` without blurring, so a long prompt still wraps but
Enter sends.

Queued prompts are unchanged: while a turn runs, the same composer queues the
message and the session screen shows it in \\`NativeQueueDock\\` above the composer,
where it can be edited, removed, or steered into the running turn.

### App identity

The packaged app carried the stock Expo launcher icons and a pure-white splash
with Expo's default mark, and its \\`colorPrimary\\` was a leftover navy
(\\`#023c69\\`). Every launcher density, the adaptive foreground, and the splash logo
are now the product's whale mark in the desktop brand \\`rgb(15, 17, 21)\\` on white,
\\`colorPrimary\\` matches that brand, and the status and navigation bars request dark
content over the same white the desktop paints.

## Module layout (2026-11-02)

Three screens had grown past a thousand lines each, which made every review read
the whole file to find one control. They are now one component per concern, with
no behaviour change:

| Was | Now |
| --- | --- |
| \\`app/settings.tsx\\` 1312 | screen shell 139 + \\`settings/general\\` 199, \\`models\\` 116, \\`plugins\\` 114, \\`presets\\` 153, \\`connection\\` 105, \\`shared\\` 276, \\`styles\\` 340, \\`labels\\` 35 |
| \\`src/components/session-drawer.tsx\\` 1012 | drawer 564 + \\`session-drawer-items\\` 208 + \\`session-drawer-styles\\` 270 |
| \\`app/session/[sessionId].tsx\\` 1049 | screen 675 + \\`session-message-row\\` 225 + \\`session-screen-state\\` 164 + \\`session-screen-styles\\` 121 |

Two rules keep the split from becoming a second kind of coupling: a style sheet
is exported from its own module so siblings share one built sheet (instead of
each re-exporting a factory), and section helpers that more than one screen file
names live in \\`settings-logic\\` rather than in the first file that needed them.

## Checking a change

1. Read the Web value from the tables above, or re-derive it from
   `design-platform.css` and the computed styles at 393×852.
2. Change the native token or the one screen style, never both.
3. Build the Android client and screenshot the screen at 1080×2400; compare with
   the Web capture of the same surface from the same pass.
4. `npx tsc --noEmit && npx vitest run` before installing.
