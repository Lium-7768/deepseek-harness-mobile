import { format, t as message } from '@/locale'

/**
 * What a finished turn is worth telling a reader who is not looking at it.
 *
 * A turn runs for minutes, so the reader usually leaves the conversation. The rules here
 * decide when the phone speaks up about it, and they are pure so the ordering — active
 * versus away, focused versus elsewhere — stays testable without a device.
 *
 * The stream itself only runs while the app is in the foreground, so a completion while
 * the phone is locked is reported when the reader comes back: the resumed session list is
 * compared against the sessions that were still running.
 */

/** Where the app stood when a turn finished. */
export type CompletionContext = {
  /** App is in the foreground. */
  active: boolean
  /** The finished session is the one on screen, so its own transcript already shows it. */
  focused: boolean
  /** The app may post local notifications. */
  granted: boolean
}

/**
 * Decides whether a finished turn earns a banner.
 *
 * @param context - Foreground state, focus of the finished session, and permission.
 * @returns True when nobody else on screen already shows the result.
 */
export function shouldPresentCompletion({ active, focused, granted }: CompletionContext): boolean {
  return active && granted && !focused
}

/**
 * Decides whether a finished turn should raise the icon badge.
 *
 * @param context - Foreground state, focus of the finished session, and permission.
 * @returns True when the reader is not looking at any screen that shows the result.
 */
export function shouldBadgeCompletion({ active, focused }: { active: boolean; focused: boolean }): boolean {
  return !active || !focused
}

/**
 * Names the finished session in a notification body.
 *
 * @param title - Session title, or undefined when the list has not named it yet.
 * @returns Localized body copy.
 */
export function completionBody(title: string | undefined): string {
  const name = title?.trim()
  return name === undefined || name === ''
    ? message('completion.bodyFallback')
    : format('completion.body', { title: name })
}

/**
 * Renders the line shown when the reader returns to an app that was away.
 *
 * @param count - Sessions that finished while the app was not running its stream.
 * @returns Localized summary copy.
 */
export function awaySummary(count: number): string {
  return format('completion.awaySummary', { count })
}
