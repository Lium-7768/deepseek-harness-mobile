import { focusManager } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AppState } from 'react-native'

/** React Query's browser focus listener does not observe native foreground/background transitions. */
export function useNativeQueryFocus(): void {
  useEffect(() => {
    focusManager.setFocused(AppState.currentState === 'active')
    const subscription = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'))
    return () => {
      subscription.remove()
      focusManager.setFocused(undefined)
    }
  }, [])
}
