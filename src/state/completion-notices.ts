import {
  awaySummary,
  type NoticeKind,
  noticeContent,
  noticeIdentifier,
  shouldNotice,
} from '@/components/notification-content'
import { showSnackbar } from '@/state/snackbar'
import { t as message } from '@/locale'

/**
 * Notices for conversations the reader is not watching.
 *
 * A turn runs for minutes, so the reader leaves the conversation. When it finishes,
 * blocks on a question, or fails, the phone says so — naming the conversation, playing
 * a tone chosen by what happened, and carrying the session id that reopens it.
 *
 * The stream that reports these runs only while the app is active, so the module reads
 * two sources: live status events while the app is open, and the resumed session list
 * for whatever finished while it was away. A notice posted here always describes a
 * state the reader cannot already see on screen.
 *
 * Every call swallows its own failure: a missing permission, a missing engine, or a
 * refused notification must never disturb the transcript.
 */

let granted = false
let asked = false
/** Set once the handler and the banner actions are registered. */
let prepared = false
let visibleSessionId: string | undefined
/** Whether an overlay the reader opened, such as the session drawer, covers the screen. */
let covered = false
/** Sessions the client has seen running; a later `false` for one of them is a completion. */
const running = new Set<string>()
/** Conversations holding at least one notice the reader has not opened yet. */
const unseen = new Set<string>()
/**
 * The Host's reading records, keyed by Session.
 *
 * The desktop owns whether a completed turn has been acknowledged. Counting completions
 * here gave the two clients separate opinions of the same conversation, and only one of
 * them could be right. This mirror is refreshed by the session list and by the gateway's
 * `host/read-state-changed` event; `unseen` stays for what the phone saw before the list
 * caught up.
 */
const hostUnread = new Set<string>()
/** Titles observed from the session list, used to name a notification. */
const titles = new Map<string, string>()
/** Two notices of one kind closer than this read as one interruption. */
const KIND_QUIET_MS = 2_500
/** When each kind last sounded, so a reconnect cannot ring the same tone twice. */
const lastPresentedAt = new Map<NoticeKind, number>()
let awaySince: number | undefined
/** Mirrors the app's lifecycle; set by the bridge, which owns the listener. */
let appActive = true

/**
 * Registers the presentation rules and the banner's open action.
 *
 * Runs once, before any notice is posted: the handler decides how a notice looks while
 * the app is in the foreground, and a category has to exist before a banner offers its
 * action.
 */
export async function prepareNotifications(): Promise<void> {
  if (prepared) return
  prepared = true
  try {
    const engine = await import('expo-notifications')
    engine.setNotificationHandler({
      handleNotification: () =>
        Promise.resolve({
          // The tone is the point: the reader learns that a turn needs them without
          // looking at the screen.
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
    })
    await engine.setNotificationCategoryAsync('completion-ask', [
      {
        identifier: 'open',
        buttonTitle: message('completion.openAction'),
        // The banner's own tap already opens the app; the action exists so the reader
        // can open the conversation without dismissing the rest of Notification Centre.
        options: { opensAppToForeground: true },
      },
    ])
    await engine.setNotificationCategoryAsync('completion-approve', [
      { identifier: 'open', buttonTitle: message('completion.openAction'), options: { opensAppToForeground: true } },
    ])
  } catch {
    // Without the handler the app still works; it simply cannot post notices.
  }
}

/**
 * Records which conversation the router is showing.
 *
 * The route, not the mounted screen, decides this: a conversation stays mounted behind
 * whatever the reader navigates to, and a turn finishing behind the settings screen is
 * exactly the case a notice exists for.
 *
 * @param sessionId - Conversation in the current route, if it is a conversation.
 */
export function setVisibleSession(sessionId: string | undefined): void {
  visibleSessionId = sessionId
  // Opening the transcript is what answers "did the reader see this"; the badge follows.
  if (sessionId !== undefined && unseen.delete(sessionId)) void pushBadge()
}

/**
 * Records that an overlay covers the conversation on screen.
 *
 * The drawer sits over the transcript without unmounting it, so the reader is not
 * reading anything while it is open and a completion still deserves its notice.
 *
 * @param isCovered - Whether an overlay is over the current screen.
 */
export function setConversationCovered(isCovered: boolean): void {
  covered = isCovered
}

/**
 * Feeds one status observation into the tracker.
 *
 * @param sessionId - Session the status belongs to.
 * @param isRunning - Whether the Host reports it as running.
 */
export function noteSessionRunning(sessionId: string, isRunning: boolean): void {
  if (isRunning) {
    running.add(sessionId)
    return
  }
  if (!running.delete(sessionId)) return
  noteFinished(sessionId)
}

/**
 * Feeds the session list, which is the only source that reports completions while the
 * stream was stopped.
 *
 * @param sessions - Rows carrying a session id, a title and the Host's running flag.
 */
export function noteSessionList(
  sessions: ReadonlyArray<{ completionUnread?: boolean; running?: boolean; sessionId: string; title?: string }>,
): void {
  // The Host's reading record replaces the local opinion for every Session it names, so a
  // mark the desktop cleared stops counting here on the next list.
  for (const session of sessions) {
    if (session.completionUnread === true) hostUnread.add(session.sessionId)
    else hostUnread.delete(session.sessionId)
  }
  void pushBadge()
  for (const session of sessions) {
    if (session.title !== undefined && session.title.trim() !== '') titles.set(session.sessionId, session.title)
    if (session.running === true) running.add(session.sessionId)
    else if (session.running === false && running.delete(session.sessionId)) noteFinished(session.sessionId)
  }
}

/**
 * Reports that a turn stopped to ask the reader something.
 *
 * This is the one state worth interrupting a reader who already has the conversation
 * open: the turn cannot move until they answer, and nothing on screen makes a sound.
 *
 * @param sessionId - Conversation whose turn is waiting.
 * @param kind - Whether the turn is waiting on a question or on a tool approval.
 * @param detail - The question text, or the tool that needs approving.
 */
export function noteInteractionRequested(sessionId: string, kind: 'approve' | 'ask', detail: string | undefined): void {
  // A question interrupts even on its own screen, but it is still being read there.
  if (!isWatched(sessionId)) unseen.add(sessionId)
  void present(kind, sessionId, detail)
  void pushBadge()
}

/**
 * Reports that a turn ended in an error.
 *
 * @param sessionId - Conversation whose turn failed.
 * @param detail - The failure's message, when the event carried one.
 */
export async function noteSessionFailed(sessionId: string, detail: string | undefined): Promise<void> {
  if (!isWatched(sessionId)) unseen.add(sessionId)
  await present('failed', sessionId, detail)
  void pushBadge()
}

/** Records that the app left the foreground; the next foreground reports what finished. */
export function noteAppState(state: string): void {
  appActive = state === 'active'
  if (appActive) {
    const pending = unreadSessions()
    if (awaySince !== undefined && pending.size > 0) {
      const count = pending.size
      void pushBadge()
      showSnackbar(awaySummary(count))
    }
    awaySince = undefined
    return
  }
  awaySince ??= Date.now()
}

/**
 * Asks for notification permission once, at the first send.
 *
 * A prompt at launch would land before the reader has a reason to want one, and an
 * unexplained refusal cannot be taken back — iOS only offers the request once.
 */
export async function requestCompletionPermission(): Promise<boolean> {
  if (granted) return true
  if (asked) return granted
  asked = true
  try {
    await prepareNotifications()
    const engine = await import('expo-notifications')
    const existing = await engine.getPermissionsAsync()
    const result = existing.granted ? existing : await engine.requestPermissionsAsync()
    granted = result.granted
  } catch {
    granted = false
  }
  // A refused permission is silent otherwise: the reader would wait for a notice that
  // can never arrive. Said once, at the moment they first send something.
  if (!granted) showSnackbar(message('completion.permissionDenied'))
  return granted
}

/**
 * Clears a conversation's unread mark because its transcript is on screen.
 *
 * `setVisibleSession` already does this when the route changes, but a turn can finish
 * while the reader is already in the conversation — the route never changes, so nothing
 * would clear the mark it just added.
 *
 * @param sessionId - Conversation now on screen.
 */
export function noteSessionRead(sessionId: string): void {
  if (unseen.delete(sessionId)) void pushBadge()
}

/**
 * Replaces the Host's unread set from a pushed reading-state frame.
 *
 * The frame carries every record the Host currently holds, so a Session missing from it
 * has been read. Anything the phone counted before this frame arrived is dropped for the
 * Sessions the frame names, which is what makes a mark cleared on the desktop disappear
 * from the phone badge too.
 *
 * @param items - One entry per Session the Host reports.
 */
export function noteReadState(items: ReadonlyArray<{ completionUnread?: boolean; sessionId: string }>): void {
  for (const item of items) {
    if (item.completionUnread === true) hostUnread.add(item.sessionId)
    else hostUnread.delete(item.sessionId)
    // The Host has spoken for this Session, so the phone's earlier guess is settled.
    unseen.delete(item.sessionId)
  }
  void pushBadge()
}

/**
 * Records that the reader opened a conversation from its notice.
 *
 * @param sessionId - Conversation the notice pointed at.
 */
export function noteNoticeOpened(sessionId: string): void {
  if (unseen.delete(sessionId)) void pushBadge()
}

/**
 * Whether the reader is looking at this conversation right now.
 *
 * The route names the conversation, the app has to be in the foreground, and no overlay
 * may cover it. A notice exists for the states the reader cannot already see, and so
 * does the badge: counting a turn the reader watched finish leaves a number on the icon
 * they have no way to clear without leaving and re-entering the conversation.
 *
 * @param sessionId - Conversation to test.
 * @returns True when its transcript is the thing on screen.
 */
function isWatched(sessionId: string): boolean {
  return appActive && !covered && sessionId === visibleSessionId
}

function noteFinished(sessionId: string): void {
  // Watching a turn finish is reading it: no badge, and `present` stays silent anyway.
  if (!isWatched(sessionId)) unseen.add(sessionId)
  void present('done', sessionId)
  void pushBadge()
}

async function present(kind: NoticeKind, sessionId: string, detail?: string): Promise<void> {
  // A notice about the screen the reader is already looking at is noise, except for a
  // question: that one stops the turn until they answer it.
  const focused = isWatched(sessionId)
  if (!shouldNotice({ kind, focused, granted })) return
  // A reconnect can flip several sessions at once. The first notice of a kind says it
  // with sound; the rest arrive as badge and list, because a tone per session rings
  // the same interruption five times. Same rule the desktop sound notifier uses.
  const now = Date.now()
  const last = lastPresentedAt.get(kind)
  if (last !== undefined && now - last < KIND_QUIET_MS) return
  lastPresentedAt.set(kind, now)
  try {
    const engine = await import('expo-notifications')
    await engine.scheduleNotificationAsync({
      // Posting under a stable identifier replaces the conversation's previous notice of
      // the same kind instead of stacking a second banner for one turn.
      identifier: noticeIdentifier(sessionId, kind),
      content: noticeContent(kind, sessionId, titles.get(sessionId), detail),
      trigger: null,
    })
  } catch {
    // A refused or unavailable notification must not affect the turn it reports.
  }
}

/**
 * Every conversation currently unread, according to the Host and the phone's own backlog.
 *
 * @returns Session ids the badge and the away summary count.
 */
function unreadSessions(): Set<string> {
  return new Set([...hostUnread, ...unseen])
}

async function pushBadge(): Promise<void> {
  try {
    const engine = await import('expo-notifications')
    await engine.setBadgeCountAsync(unreadSessions().size)
  } catch {
    // The icon badge is decoration; losing it changes nothing about the session.
  }
}

/** Clears every tracker. Used when the pairing is dropped or replaced. */
export function resetCompletionNotices(): void {
  running.clear()
  unseen.clear()
  titles.clear()
  lastPresentedAt.clear()
  visibleSessionId = undefined
  covered = false
  awaySince = undefined
  granted = false
  asked = false
  void pushBadge()
}
