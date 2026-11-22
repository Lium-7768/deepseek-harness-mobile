# Mobile/Desktop UI parity review

This review compares mobile `e6f98cb` and desktop `2e39e70496`. Desktop is a read-only reference. The mobile change in this review adds local automation-task catalog search and status filters. Device inspection covers an iPhone 17 Pro simulator at 402 pt logical width; it does not cover Android or a physical device.

## Confirmed differences

| Area                   | Mobile behavior                                                                                       | Desktop behavior                                                                                                          | Assessment                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session navigation     | Drawer with workspace groups, touch menus, and full-screen routes                                     | Persistent/collapsible sidebar with pointer actions and keyboard shortcuts                                                | Intentional native adaptation                                                                                                                                         |
| Conversation header    | One-line session title, preset/actions, and connection status                                         | Session ancestry, pluggable header actions, and view tabs                                                                 | Reduced mobile navigation; trajectory and child sessions remain reachable through native routes/actions                                                               |
| Conversation           | Inverted FlatList, native message/tool rows, bottom composer and dock                                 | Chat flow in the desktop conversation shell with plugin-rendered rows                                                     | Different platform layout; verify scrolling, keyboard clearance, and streaming on-device                                                                              |
| Settings               | Six native sections; plugin inventory is read-only                                                    | Extensible settings modal and plugin-owned settings sections                                                              | Mobile settings surface is intentionally narrower; plugin installation is deferred for safety                                                                         |
| Automation tasks       | Native list, create, pause/resume/delete, target-session navigation, local search, and status filters | Searchable catalog, active/paused/ended/all filters, selected-task detail, edit/history/run actions, and bulk clear ended | Detail/history/edit/run mobile controls remain absent; the gateway exposes the relevant desktop-owned view/history/run/edit routes but MobileApi does not expose them |
| Files and deliverables | File-change diff rows and transcript deliverable rows                                                 | Full file, document, and deliverables navigation                                                                          | Deliberate capability gap pending a scoped file-access design                                                                                                         |

## Simulator checks

- Current task-manager build renders the search field and four status controls without horizontal overflow at 402 pt.
- Selecting `Paused` updates the selected appearance and retains the task-manager empty state when no matching tasks exist.
- Entering a non-matching query keeps the query visible and shows the empty state without moving or hiding the header controls.
- The current desktop catalog returned no task rows, so card filtering/search, long task titles, and task-action menus were not exercised with populated data.
- A session composer was opened on the same simulator in the current native build. The attach and send controls render at 32 x 32 pt; keyboard typing works. A temporary test draft was cleared without sending.
- The simulator's accessibility bridge stopped returning UI elements after the native rebuild; screenshots and HID tap checks were used for the task filter. Screen recording, dark appearance, Android, and physical device are not covered.

## Remaining task-manager parity

Mobile currently lacks task detail and edit UI, delivery history, run-now control, and clear-ended action. The gateway source already includes desktop `schedule/view`, `schedule/history`, `schedule/run`, and `schedule/edit` routes. The phone does not currently wrap those operations in `MobileApi`. Ended-task bulk removal is not currently forwarded by the gateway.

These operations are tracked separately. Editing must preserve the Host's `updatedAt` compare-and-swap semantics; history should use the Host's paging contract; run-now needs an explicit confirmation and result feedback. No desktop or gateway code was changed for this UI review.
