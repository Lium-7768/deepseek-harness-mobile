import { createElement } from 'react'
import { act, cleanup, render } from './support/native-testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getLastNotificationResponseAsync, addNotificationResponseReceivedListener, replace } = vi.hoisted(() => ({
  getLastNotificationResponseAsync: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  replace: vi.fn(),
}))

vi.mock('expo-notifications', () => ({
  __esModule: true,
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
}))
vi.mock('expo-router', () => ({
  router: { replace },
  usePathname: () => '/workspace',
}))
vi.mock('@/state/completion-notices', () => ({
  noteNoticeOpened: vi.fn(),
}))
vi.mock('@/api/connection-store', () => ({
  clearConnection: vi.fn(),
  loadConnection: vi.fn(),
  saveConnection: vi.fn(),
}))

import { NotificationRouter, resetHandledNotificationResponses } from '@/components/notification-router'
import { useConnectionStore } from '@/state/connection'

const sampleResponse = {
  actionIdentifier: 'default',
  notification: {
    date: 1_700_000_000_000,
    request: {
      identifier: 'completion:sess-1:done',
      content: { data: { sessionId: 'sess-1' } },
    },
  },
}

const flush = async (): Promise<void> => {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  resetHandledNotificationResponses()
  vi.clearAllMocks()
  useConnectionStore.setState({ connection: undefined, initialized: true })
})

afterEach(cleanup)

describe('NotificationRouter', () => {
  it('does not replay the cold-launch notification when remounted after a desktop switch', async () => {
    useConnectionStore.setState({
      connection: { gatewayUrl: 'https://desktop-a.test', deviceId: 'dev-1', accessToken: 'tok' },
      initialized: true,
    })
    getLastNotificationResponseAsync.mockResolvedValue(sampleResponse)

    const first = await render(createElement(NotificationRouter))
    await flush()
    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/session/sess-1')

    // Simulate ConnectionQueries remounting on desktop switch.
    await first.unmount()
    await render(createElement(NotificationRouter))
    await flush()
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it('does not navigate to a session when the device is unpaired', async () => {
    getLastNotificationResponseAsync.mockResolvedValue(sampleResponse)
    await render(createElement(NotificationRouter))
    await flush()
    expect(replace).not.toHaveBeenCalled()
  })
})
