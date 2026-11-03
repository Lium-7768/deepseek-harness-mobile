import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'

/** Prevents polling a mounted drawer route that is hidden or in the background. */
export function useScreenActive(): boolean {
  const [focused, setFocused] = useState(false)
  const [foreground, setForeground] = useState(AppState.currentState === 'active')
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      return () => setFocused(false)
    }, []),
  )
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'))
    return () => subscription.remove()
  }, [])
  return focused && foreground
}
