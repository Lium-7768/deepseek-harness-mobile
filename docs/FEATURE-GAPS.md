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
delete), light and dark appearance, live events over SSE.

## Missing, and worth building

| Feature | Desktop package | Gateway today | Cost |
| --- | --- | --- | --- |
| Session log export | `settings-session-log` | History route already pages the whole log | **Interface only** — assemble Markdown or JSON client-side and hand it to the share sheet |
| File explorer | `sidebar-files` | No file routes | **New routes + interface** — list, read, download. The largest single widening of the public surface, because a file route reaches the whole project tree |
| Slash commands | `commands`, `input-trigger` | No command-list route | **New route + interface** — list commands, then send one through the existing message route |
| Skills | `skill` | No route | **New route + interface** — list installed skills, attach one to a turn |
| Scheduled turns | `schedule` | No route | **New routes + interface** — list, create, cancel |

Export first: it turns a desktop-only capability into a phone one without
touching the gateway, and it is the one gap that needs no new public surface.

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

## If the ordering is yours to set

1. **Session log export** — no gateway change, immediate value away from the desk.
2. **File explorer** — the most useful remaining capability, and the one to design
   most carefully, because it decides what a stolen password can read.
3. **Slash commands and skills** — cheap once a list route exists, and they make
   the phone a usable way to drive a long turn.
4. Everything else — only with a concrete reason.
