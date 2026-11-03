import { Platform } from 'react-native'

/** Menlo is unavailable on Android; use its system monospace face. */
export const MONOSPACE_FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace'
