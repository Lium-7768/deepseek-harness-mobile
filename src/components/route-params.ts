import { mobileErrorMessage } from '@/api/mobile-api'
import { t as message } from '@/locale'

/**
 * Reads one Expo Router parameter that may arrive as a string or a list.
 *
 * A route segment declared `sessionId` can be either form: a deep link supplies
 * one string, while the same route reached from a list can supply several. The
 * first non-blank trimmed value wins.
 *
 * @param value - The raw route parameter.
 * @returns The value, or `undefined` when it carries no usable text.
 */
export function firstParam(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value.find((item) => item.trim()) : value
  return candidate?.trim() || undefined
}

/**
 * Prefixes a thrown request error with the sentence that says what failed.
 *
 * `mobileErrorMessage` already reduces the error to host copy; this adds the
 * caller's context so an alert names both the action and its failure.
 *
 * @param prefix - The sentence naming the failed action.
 * @param error - Whatever the request rejected with.
 * @returns One line combining the action and the host's reason.
 */
export function withErrorContext(prefix: string, error: unknown): string {
  return `${prefix}：${mobileErrorMessage(error, message('common.retry'))}`
}

/**
 * Narrows an optional client to the one every request path needs.
 *
 * Screen bodies build the client from the connection store, which is absent
 * until the user pairs. A query or mutation that still runs without it is a
 * programming error, not a state to render.
 *
 * @param client - Client built from the current connection.
 * @param reason - Localized message explaining that a connection is required.
 * @returns The same client, now non-optional.
 */
export function requireClient<T>(client: T | undefined, reason: string): T {
  if (client === undefined) throw new Error(reason)
  return client
}
