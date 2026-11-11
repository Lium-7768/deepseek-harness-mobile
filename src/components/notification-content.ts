import { format, t as message } from '@/locale'

/**
 * What one notification says, and how it is allowed to interrupt.
 *
 * A notification about a conversation is only useful if the reader can tell which
 * conversation it is and what it wants, without opening the app. So the title is the
 * session's own name, the second line is the state the conversation reached, and the
 * sound is chosen by that state rather than being the same tone every time.
 *
 * The rules here are pure: the state module decides *when* a notice is worth posting,
 * and this module decides *what* it says.
 */

/**
 * Why the phone speaks up.
 *
 * Ordered by how much the reader's attention is worth: a turn blocked on a question
 * cannot proceed without them, a finished turn merely waits to be read.
 */
export type NoticeKind = 'ask' | 'approve' | 'done' | 'failed' | 'plan'

/** One notification's content, in the form `expo-notifications` accepts. */
export interface NoticeContent {
  /** Groups banners from the same conversation, newest replacing older ones. */
  threadIdentifier: string
  /** Which actions the banner offers. */
  categoryIdentifier: string
  /** The banner's headline: the conversation's name. */
  title: string
  /** The line under the headline: what that conversation now wants. */
  subtitle: string
  /** The detail line, or the question the turn is waiting on. */
  body: string
  /** Bundled sound name, or `default` for the system tone. */
  sound: string
  /** Payload the response handler reads to open the conversation. */
  data: { sessionId: string; kind: NoticeKind }
}

/** The one-line state each kind reports. */
const SUBTITLE: Record<NoticeKind, () => string> = {
  ask: () => message('completion.askSubtitle'),
  approve: () => message('completion.approveSubtitle'),
  done: () => message('completion.doneSubtitle'),
  failed: () => message('completion.failedSubtitle'),
  plan: () => message('completion.planSubtitle'),
}

/**
 * The tone for each kind, matching the four the desktop's sound notifier plays so the
 * phone and the desktop sound like one product.
 */
const SOUND: Record<NoticeKind, string> = {
  ask: 'ask.wav',
  approve: 'ask.wav',
  done: 'done.wav',
  failed: 'fail.wav',
  plan: 'plan.wav',
}

/**
 * The sentence under the state line.
 *
 * `detail` is the question the turn asked, the tool that needs approving, or the
 * failure's message. It is used verbatim when present, because the reader decides
 * whether to come back from that line; when absent the copy still says what happened.
 *
 * @param kind - Why the notice is being posted.
 * @param detail - The specific text, when the event carried one.
 * @returns Localized body copy.
 */
function bodyFor(kind: NoticeKind, detail: string | undefined): string {
  const text = detail?.trim()
  const hasDetail = text !== undefined && text !== ''
  switch (kind) {
    case 'ask':
      return hasDetail ? text : message('completion.askBodyFallback')
    case 'approve':
      return hasDetail ? format('completion.approveBody', { tool: text }) : message('completion.approveBodyFallback')
    case 'failed':
      return hasDetail ? text : message('completion.failedBodyFallback')
    case 'plan':
      return message('completion.planBody')
    case 'done':
      return message('completion.doneBody')
    default:
      return message('completion.doneBody')
  }
}

/**
 * Builds the notification for one state change in one conversation.
 *
 * @param kind - Why the notice is being posted.
 * @param sessionId - Conversation the notice opens.
 * @param title - The conversation's name, once the session list has named it.
 * @param detail - The specific question, tool, or error when the event carried one.
 * @returns Content ready for `scheduleNotificationAsync`.
 */
export function noticeContent(
  kind: NoticeKind,
  sessionId: string,
  title: string | undefined,
  detail?: string,
): NoticeContent {
  const name = title?.trim()
  return {
    title: name === undefined || name === '' ? message('completion.appName') : name,
    subtitle: SUBTITLE[kind](),
    body: bodyFor(kind, detail),
    sound: SOUND[kind],
    // One conversation is one thread: a later state replaces the previous banner
    // instead of stacking, which is what keeps a long turn from filling Notification
    // Centre with the same conversation.
    threadIdentifier: sessionId,
    categoryIdentifier: `completion-${kind}`,
    data: { sessionId, kind },
  }
}

/**
 * The identifier a notice is posted under.
 *
 * iOS replaces a scheduled notification that reuses an identifier, so posting under
 * `<session>:<kind>` means the second question from one conversation replaces the
 * first rather than leaving two banners for one turn.
 *
 * @param sessionId - Conversation the notice is about.
 * @param kind - Why the notice is being posted.
 * @returns Identifier stable for one conversation and one state.
 */
export function noticeIdentifier(sessionId: string, kind: NoticeKind): string {
  return `completion:${sessionId}:${kind}`
}

/**
 * Whether a notice for this state is worth the reader's interruption.
 *
 * @param kind - Why the notice would be posted.
 * @param focused - The conversation is already on screen, so it needs no banner.
 * @param granted - The app may post local notifications.
 * @returns True when a banner would tell the reader something they cannot see.
 */
export function shouldNotice({
  kind,
  focused,
  granted,
}: {
  kind: NoticeKind
  focused: boolean
  granted: boolean
}): boolean {
  if (!granted) return false
  if (!focused) return true
  // The transcript shows a finished turn and its own failure as they happen, but a
  // question stops the turn and is the one thing worth a banner even on its own screen.
  return kind === 'ask' || kind === 'approve'
}
/**
 * Renders the line shown when the reader returns to an app that was away.
 *
 * @param count - Conversations that finished while the app was not running its stream.
 * @returns Localized summary copy.
 */
export function awaySummary(count: number): string {
  return format('completion.awaySummary', { count })
}
