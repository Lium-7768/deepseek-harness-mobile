import {
  awaySummary,
  completionBody,
  shouldBadgeCompletion,
  shouldPresentCompletion,
} from '@/components/completion-notice-logic'
import { showSnackbar } from '@/state/snackbar'
import { t as message } from '@/locale'

/**
 * Completion notices for turns the reader is not watching.
 *
 * The stream runs only while the app is in the foreground, so iOS never reports a turn
 * that ends while the phone is locked: there is no push channel from the Gateway. What
 * this module can do is report a turn that ends while the reader is in another screen of
 * the app, and, on return, a summary of what finished while the app was away — the
 * resumed session list carries the `running` flags that answer it.
 *
 * Every call swallows its own failure: a missing permission, a missing engine or a
 * refused notification must never disturb the transcript.
 */

let granted = false
let asked = false
let focusedSessionId: string | undefined
/** Sessions the client has seen running; a later `false` for one of them is a completion. */
const running = new Set<string>()
/** Completions the reader has not looked at since they happened. */
const unseen = new Set<string>()
/** Titles observed from the session list, used to name a notification. */
const titles = new Map<string, string>()
let awaySince: number | undefined
/** Mirrors the app's lifecycle; set by the bridge, which owns the listener. */
let appActive = true

/** Records which conversation is on screen, so its own completion stays silent. */
export function setFocusedSession(sessionId: string | undefined): void {
  focusedSessionId = sessionId
  if (sessionId !== undefined && unseen.delete(sessionId)) void pushBadge()
}

/**
 * Feeds one status observation into the completion tracker.
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
  markFinished(sessionId)
}

/**
 * Feeds the session list, which is the only source that reports completions while the
 * stream was stopped.
 *
 * @param sessions - Rows carrying a session id, a title and the Host's running flag.
 */
export function noteSessionList(
  sessions: ReadonlyArray<{ running?: boolean; sessionId: string; title?: string }>,
): void {
  for (const session of sessions) {
    if (session.title !== undefined && session.title.trim() !== '') titles.set(session.sessionId, session.title)
    if (session.running === true) running.add(session.sessionId)
    else if (session.running === false && running.delete(session.sessionId)) markFinished(session.sessionId)
  }
}

/** Records that the app left the foreground; the next foreground reports what finished. */
export function noteAppState(state: string): void {
  appActive = state === 'active'
  if (appActive) {
    if (awaySince !== undefined && unseen.size > 0) {
      const count = unseen.size
      unseen.clear()
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
    const engine = await import('expo-notifications')
    // A foreground banner is the whole point: the app is open, on another screen.
    engine.setNotificationHandler({
      handleNotification: () =>
        Promise.resolve({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
    })
    const existing = await engine.getPermissionsAsync()
    const result = existing.granted ? existing : await engine.requestPermissionsAsync()
    granted = result.granted
  } catch {
    granted = false
  }
  return granted
}

function markFinished(sessionId: string): void {
  unseen.add(sessionId)
  const focused = sessionId === focusedSessionId
  if (shouldPresentCompletion({ active: appActive, focused, granted })) void present(sessionId)
  if (shouldBadgeCompletion({ active: appActive, focused })) void pushBadge()
}

async function present(sessionId: string): Promise<void> {
  try {
    const engine = await import('expo-notifications')
    await engine.scheduleNotificationAsync({
      content: { body: completionBody(titles.get(sessionId)), title: message('completion.title') },
      trigger: null,
    })
  } catch {
    // A refused or unavailable notification must not affect the turn it reports.
  }
}

async function pushBadge(): Promise<void> {
  try {
    const engine = await import('expo-notifications')
    await engine.setBadgeCountAsync(unseen.size)
  } catch {
    // The icon badge is decoration; losing it changes nothing about the session.
  }
}

/** Clears every tracker. Used when the pairing is dropped or replaced. */
export function resetCompletionNotices(): void {
  running.clear()
  unseen.clear()
  titles.clear()
  focusedSessionId = undefined
  awaySince = undefined
  granted = false
  asked = false
  void pushBadge()
}
