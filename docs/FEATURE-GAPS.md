# Desktop features the phone does not have

What the desktop client offers, what exists on the phone today, and what each
missing surface would cost. Counts come from this tree:

- desktop UI packages: 58 under `packages/client/ui-*`
- phone routes: 14 files under `app/`
- mobile gateway routes: 39 (14 literal, 25 parametric) in
  `~/code/deepseek/dsh-mobile-bridge/src/gateway/mobile-gateway.ts`

The gateway is the constraint, not the UI. A surface whose data it already
serves costs interface work; one it does not serve needs a new route first, and
that route widens what a public URL can reach.

## Already on the phone

Sessions (list, create, rename, archive, fork, search, running), conversation and
composer, queue and steering, background jobs, goals, child subagents, message
feedback, trajectory, image attachments, pending interactions (approval,
questions, plan review), model and agent-preset pickers, permission presets,
settings (general, models, plugins inventory, presets), workspaces (rename,
delete), light and dark appearance, live events over SSE, session-log export to
the share sheet, file-change diffs inside tool cards, and the release line in
General settings.

## Missing, and worth building

| Feature | Desktop package | Gateway today | Cost |
| --- | --- | --- | --- |
| File explorer | `sidebar-files` | No file routes | **New routes + interface** — list, read, download. The largest single widening of the public surface, because a file route reaches the whole project tree |
| Slash commands | `commands`, `input-trigger` | No command-list route | **New route + interface** — list commands, then send one through the existing message route |
| Skills | `skill` | No route | **New route + interface** — list installed skills, attach one to a turn |
| Scheduled turns | `schedule` | No route | **New routes + interface** — list, create, cancel |

Each remaining row needs a new public route before any interface work, and every
new route widens what a paired phone can reach on a public URL.

## Missing, and a poor fit for a phone

| Feature | Desktop package | Why it is awkward |
| --- | --- | --- |
| Terminal | `sidebar-terminal` | A PTY over a phone keyboard, on a public URL that already executes code |
| Document preview | `sidebar-documentpreview` | Depends on the file explorer; PDF and Office rendering on a small screen |
| Browser preview | `sidebar-browser` | Needs a remote viewport stream |
| Workflow runs | `workflow-run` | The graph editor has no touch equivalent |
| Plugin management | `plugin-manager`, `plugin-market`, `settings-plugin-inventory` | Installing plugins from a phone changes what the desktop executes; a mistap is expensive |
| Deliverables | `deliverables` | Rich file surfaces, same dependency as the explorer |

## Desktop-only by nature

Shortcuts (`shortcuts`), directory pickers (`directory-picker-browse`,
`directory-picker-native`), file drag (`file-drag`), window docking (`dockkit`),
opening a file in another app (`open-in-app`), the right bar and its drag handles
(`layout`). These describe a keyboard, a pointer, and a window; a phone has none
of the three.

The account surfaces (`settings-account`: the sidebar account menu, its 更多 row,
the settings entry it owns, and the Platform top-up pages) describe a signed-in
DeepSeek account in a browser or on the desktop. A paired phone authenticates with
a device credential issued by the desktop, holds no Platform token, and reaches
settings from the drawer, so there is no account state to show and no menu slot to
move settings into. The version line is the one piece of that surface that carries
over, and it now lives in General settings.

## What the phone now does instead

**Session log export.** The drawer row menu carries 导出日志. The phone pages
`/v1/sessions/<id>/history` back to the log's first event (40 pages, then it says
so in the file's header), projects the same rows the conversation draws, renders
Markdown with `src/export/session-log.ts`, writes the file to the cache directory,
and hands it to the system share sheet. Nothing leaves the device until the reader
picks a target, and the gateway is unchanged.

**File-change diffs.** A `write`, `edit`, or `str_replace_editor` call carries its
own change in its arguments, so the tool card derives it (`src/components/tool-diff-logic.ts`)
and draws removed and added lines with the desktop's own line tints instead of
echoing raw JSON. This is presentation of data the phone already had.

The derivation covers `write` (a new file, or a whole-file overwrite) and `edit`
(`old_string` → `new_string`), which is what the standard preset emits. A `run_code`
call that happens to write a file through Node is not a file mutation to the model
and is not treated as one, matching the desktop.

**Release line.** General settings prints 当前版本：<version> from the manifest, the
same position the desktop gives it, so a support report names the build in hand.

## If the ordering is yours to set

1. **File explorer** — the most useful remaining capability, and the one to design
   most carefully, because it decides what a stolen password can read.
2. **Slash commands and skills** — cheap once a list route exists, and they make
   the phone a usable way to drive a long turn.
3. **Scheduled turns** — the last of the desktop's unattended surfaces, and the one
   whose request needs the most care: a schedule created from a phone runs on the
   desktop.
4. Everything else — only with a concrete reason.
