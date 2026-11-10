import { router } from 'expo-router'

/**
 * Returns from a screen that was opened over a session, back to that session.
 *
 * `router.back()` walks the navigation stack, which is not the same thing: the stack
 * also holds every workspace and settings visit from earlier in the app's life, so a
 * back press after opening a child agent landed on the workspace list — or on the
 * conversation that happened to be open before this one. Every screen that belongs to
 * a session therefore names its parent in the URL, and this helper returns to it.
 *
 * @param parentSessionId - The session the caller belongs to, from the route params.
 * @returns Nothing; the navigation itself is the effect.
 */
export function backToSession(parentSessionId: string | undefined): void {
  if (parentSessionId !== undefined && parentSessionId !== '') {
    router.replace(`/session/${parentSessionId}`)
    return
  }
  // Without a parent the screen was reached without one (a deep link, say), so the
  // only honest destination is the list that opens sessions.
  if (router.canGoBack()) router.back()
  else router.replace('/workspace')
}
