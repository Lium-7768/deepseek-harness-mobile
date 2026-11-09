import { describe, expect, it, vi } from 'vitest'

// The status component pulls the whole up-stream row stack; only the formatter is
// under test, so the pieces it imports for rendering are stubbed out.
vi.mock('react-native', () => ({
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => false,
    addEventListener: () => ({ remove: () => undefined }),
  },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
  Platform: { OS: 'ios' },
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View',
}))
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
vi.mock('@/components/native-brand-mark', () => ({ NativeBrandMark: 'BrandMark' }))
vi.mock('@/components/native-flow-row', () => ({ NativeFlowRow: 'FlowRow' }))
vi.mock('@/components/native-tool-card', () => ({ NativeToolCard: 'ToolCard' }))

import { formatDurationLabel } from '@/components/native-conversation-status'

describe('running duration wording', () => {
  it('names milliseconds below a second so a fresh turn never reads as zero seconds', () => {
    expect(formatDurationLabel(850)).toBe('850毫秒')
    expect(formatDurationLabel(1_000)).toBe('1秒')
    expect(formatDurationLabel(81_000)).toBe('1分21秒')
  })
})
