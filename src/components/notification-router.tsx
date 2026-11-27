import { noteNoticeOpened } from '@/state/completion-notices'
import { useConnectionStore } from '@/state/connection'
import { type Href, router, usePathname } from 'expo-router'
import { useEffect, useRef } from 'react'

/** The parts of a notification response this module reads. */
interface NoticeResponse {
  actionIdentifier?: string
  notification: {
    date?: number
    request: { identifier: string; content: { data?: Record<string, unknown> } }
  }
}

/** The conversation a notice named, or undefined when the payload is not one of ours. */
function targetOf(data: Record<string, unknown> | undefined): string | undefined {
  const sessionId = data?.sessionId
  return typeof sessionId === 'string' && sessionId !== '' ? sessionId : undefined
}

/**
 * Opens the conversation a notice points at.
 *
 * A tapped notice is a promise that the app lands on the conversation it named, so the
 * handler covers the three ways that tap can arrive: while the app is open behind the
 * banner, while it is suspended in the background, and while it is not running at all —
 * the last one only reported once, by `getLastNotificationResponseAsync`.
 *
 * Navigation is `replace` rather than `push`: the notice is the reader asking for that
 * conversation, not a step to come back from, and pushing would leave the screen they
 * were on behind it.
 */
/**
 * Responses already answered during this app process.
 *
 * Kept at module scope because `ConnectionQueries` remounts on disconnect or desktop
 * switch: a component-local ref would clear and cause `getLastNotificationResponseAsync`
 * to replay the cold-launch tap into an unpaired or different desktop.
 */
const handledResponses = new Set<string>()

/** Clears process-scoped response deduplication between isolated unit tests. */
export function resetHandledNotificationResponses(): void {
  handledResponses.clear()
}

export function NotificationRouter(): null {
  const pathname = usePathname()
  // The listener outlives every navigation, so the route it compares against is read
  // through a ref rather than captured in the effect's closure.
  const current = useRef(pathname)
  current.current = pathname

  useEffect(() => {
    let active = true
    let subscription: { remove: () => void } | undefined

    const open = (sessionId: string, responseId: string): void => {
      if (handledResponses.has(responseId)) return
      handledResponses.add(responseId)
      if (useConnectionStore.getState().connection === undefined) return
      noteNoticeOpened(sessionId)
      const target = `/session/${encodeURIComponent(sessionId)}`
      if (current.current === target) return
      router.replace(target as Href)
    }
    const openFrom = (response: NoticeResponse | null): void => {
      if (response === null) return
      const sessionId = targetOf(response.notification.request.content.data)
      if (sessionId === undefined) return
      const responseKey = `${response.notification.request.identifier}:${response.notification.date ?? ''}:${response.actionIdentifier ?? ''}`
      open(sessionId, responseKey)
    }

    void (async () => {
      try {
        const engine = await import('expo-notifications')
        if (!active) return
        subscription = engine.addNotificationResponseReceivedListener(openFrom)
        // The tap that launched the app happened before this component existed, so it is
        // only readable from the backlog.
        const last = await engine.getLastNotificationResponseAsync()
        if (!active) return
        openFrom(last)
      } catch {
        // Notifications are optional: without the engine the app still opens normally.
      }
    })()

    return () => {
      active = false
      subscription?.remove()
    }
  }, [])

  return null
}
