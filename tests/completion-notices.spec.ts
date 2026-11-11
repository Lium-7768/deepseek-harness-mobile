import { act, cleanup } from './support/native-testing'
import { expect, afterEach, beforeEach, describe, it, vi } from 'vitest'

const { scheduleNotificationAsync } = vi.hoisted(() => ({ scheduleNotificationAsync: vi.fn() }))
vi.mock('expo-notifications', () => ({
  __esModule: true,
  default: {},
  scheduleNotificationAsync,
  setBadgeCountAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
  setNotificationCategoryAsync: vi.fn(),
  getPermissionsAsync: vi.fn(async () => ({ granted: true })),
  requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
}))
vi.mock('@/state/snackbar', () => ({ showSnackbar: vi.fn() }))

import {
  noteInteractionRequested,
  noteSessionRunning,
  requestCompletionPermission,
  resetCompletionNotices,
} from '@/state/completion-notices'

/** Runs one session from running to finished, the way the stream reports it. */
async function finish(sessionId: string): Promise<void> {
  noteSessionRunning(sessionId, true)
  noteSessionRunning(sessionId, false)
}

describe('completion notices', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetCompletionNotices()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('sounds once per kind inside the quiet window, however many sessions finish', async () => {
    await act(async () => {
      await requestCompletionPermission()
    })
    await act(async () => {
      await finish('first')
    })
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1)

    // A reconnect flipping several sessions at once must not ring per session.
    await act(async () => {
      await finish('second')
      await finish('third')
    })
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1)

    // Past the window the kind may sound again.
    await act(async () => {
      vi.advanceTimersByTime(2_600)
      await finish('fourth')
    })
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(2)
  })

  it('keeps distinct kinds apart, so a question never borrows the completion tone', async () => {
    await act(async () => {
      await requestCompletionPermission()
    })
    // One present at a time: two concurrent dynamic imports of the mocked engine race
    // the mock registry, which is a test-harness artefact, not product behaviour.
    await act(async () => {
      await finish('a')
      await vi.advanceTimersByTimeAsync(0)
      await noteInteractionRequested('b', 'ask', '要保留旧配置吗？')
    })
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(2)
    expect(scheduleNotificationAsync.mock.calls[1]![0].content.sound).toBe('ask.wav')
    expect(scheduleNotificationAsync.mock.calls[0]![0].content.sound).toBe('done.wav')
  })

  it('lets the same kind sound again once the quiet window has passed', async () => {
    await act(async () => {
      await requestCompletionPermission()
    })
    await act(async () => {
      await finish('a')
    })
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_600)
      await finish('b')
    })
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(2)
  })
})
