# Desktop features the phone does not have

This reference summarizes desktop capabilities, the corresponding phone coverage,
and the work or security review needed for missing surfaces. Gateway routes are
owned by the separate `dsh-mobile-bridge` repository; every added route expands what
a paired phone can reach over its public URL.

## Already on the phone

Sessions (list, create, rename, archive, fork, search, running), conversation and
composer, queue and steering, background jobs, goals, child subagents, message
feedback, trajectory, image attachments, pending interactions (approval,
questions, plan review), model and agent-preset pickers, permission presets,
slash-command and skill triggers, settings (general, models, read-only plugin
inventory, presets), workspaces (rename, delete), light and dark appearance, live
events over SSE, session-log export to the share sheet, file-change diffs inside
tool cards, scheduled-task create/view/edit/run/history/pause/resume/delete with
catalog search, status filters, and starter recommendations, and the release line
in General settings.

## Missing, and worth building

| Feature              | Desktop package | Gateway today                       | Cost                                                                                                                                                      |
| -------------------- | --------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File explorer        | `sidebar-files` | No file routes                      | **New routes + interface** — list, read, download. The largest single widening of the public surface, because a file route reaches the whole project tree |
| Deliverables browser | `deliverables`  | Message-level deliverable rows only | **New routes + interface** — current transcript rows do not provide the desktop's full file browsing and preview surface                                  |

## Missing task-manager workflows

The phone now covers searching the task catalog, filtering by status, starter
recommendations, viewing task details, editing title/prompt/timing with Host
`updatedAt` CAS, running a task now with confirmation, reading paginated delivery
history, creating/pausing/resuming/deleting tasks, and opening a task's target
Session. Only bulk removal of ended tasks (`schedule/deleteInactive`) is not yet
forwarded by the mobile gateway.

## Deferred: poor fit or high risk on a phone

| Feature                      | Desktop package                                                | Why it is deferred                                                                                     |
| ---------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Terminal                     | `sidebar-terminal`                                             | A PTY over a phone keyboard expands remote process controls on a public URL that already executes code |
| Document preview             | `sidebar-documentpreview`                                      | Depends on file access; PDF and Office rendering need a phone-specific review                          |
| Browser preview              | `sidebar-browser`                                              | Needs a remote viewport stream                                                                         |
| Workflow runs                | `workflow-run`                                                 | The graph editor has no touch interaction model                                                        |
| Plugin management and market | `plugin-manager`, `plugin-market`, `settings-plugin-inventory` | Installing plugins changes what the paired desktop executes; a mistap is expensive                     |

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

## Suggested order

1. **File explorer** — useful on a phone, but file access must be scoped before adding routes because it reaches project contents.
2. **Deliverables browser** — can build on an approved file-access design and adds a focused way to retrieve outputs.
3. Everything else — only with a concrete product need and an explicit security and touch-interaction review.
