import { setVisibleSession } from '@/state/completion-notices'
import { usePathname } from 'expo-router'
import { useEffect } from 'react'

/**
 * Keeps the notice tracker aware of which conversation the router is showing.
 *
 * Read from the route rather than from the mounted screen: a conversation stays mounted
 * behind every screen the reader visits, so mounting would claim the reader is watching
 * a turn that finished three screens away.
 */
export function NotificationFocus(): null {
  const pathname = usePathname()
  useEffect(() => {
    const match = /^\/session\/([^/]+)$/.exec(pathname)
    setVisibleSession(match === null ? undefined : decodeURIComponent(match[1]!))
  }, [pathname])
  return null
}
