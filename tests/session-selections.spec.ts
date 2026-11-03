import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERMISSION_CONFIRMATION_TIMEOUT } from '@/components/permission-confirmation'

const mocks = vi.hoisted(() => ({
  refs: [] as { current: unknown }[],
  cursor: 0,
  alert: vi.fn(),
  invalidate: vi.fn().mockResolvedValue(undefined),
  syncStatus: 'connected' as 'connected' | 'connecting' | 'disconnected',
}))
vi.mock('react', () => ({
  useEffect: (effect: () => () => void) => {
    effect()
  },
  useRef(value: unknown) {
    const index = mocks.cursor++
    return (mocks.refs[index] ??= { current: value })
  },
}))
vi.mock('react-native', () => ({ Alert: { alert: mocks.alert } }))
vi.mock('@/state/mobile-sync', () => ({
  useMobileSyncStore: (selector: (state: { status: string }) => unknown) => selector({ status: mocks.syncStatus }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
  useMutation: (options: {
    mutationFn(value: unknown): Promise<unknown>
    onSuccess(result: unknown, variables: unknown): Promise<void>
    onError(error: unknown): void
  }) => ({
    isPending: false,
    async mutateAsync(value: unknown) {
      try {
        const result = await options.mutationFn(value)
        await options.onSuccess(result, value)
        return result
      } catch (error) {
        options.onError(error)
        throw error
      }
    },
  }),
}))
import { useSessionSelections } from '@/hooks/use-session-selections'
import type { MobileApi } from '@/api/mobile-api'

function render(state: Parameters<typeof useSessionSelections>[0]) {
  mocks.cursor = 0
  return useSessionSelections(state)
}
const permissions = {
  currentValue: 'workspace-write',
  options: ['workspace-write', 'read-only', 'danger-full-access'].map((value) => ({ value, name: value })),
}
const createState = () => ({
  client: {
    sendMessage: vi.fn().mockResolvedValue({}),
    selectSessionModel: vi.fn().mockResolvedValue({}),
    selectSessionPreset: vi.fn().mockResolvedValue({}),
  } as unknown as MobileApi,
  sessionId: 'one',
  permissions,
  eventsError: false,
  eventsPending: false,
  eventsStale: false,
  status: 'idle',
  unavailable: false,
})
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('production session selection controller', () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  beforeEach(() => {
    mocks.refs = []
    mocks.cursor = 0
    mocks.alert.mockClear()
    mocks.invalidate.mockClear()
    mocks.syncStatus = 'connected'
  })
  it('sends no full-access command before destructive confirmation; cancellation is a no-op', async () => {
    const state = createState()
    const selection = render(state)
    selection.selectPermission('danger-full-access')
    expect(state.client.sendMessage).not.toHaveBeenCalled()
    const buttons = mocks.alert.mock.calls[0][2]
    expect(buttons[1].style).toBe('destructive')
    buttons[0].onPress()
    await flush()
    expect(state.client.sendMessage).not.toHaveBeenCalled()
    selection.selectPermission('danger-full-access')
    mocks.alert.mock.calls[1][2][1].onPress()
    await flush()
    expect(state.client.sendMessage).toHaveBeenCalledExactlyOnceWith('one', [
      { type: 'text', text: '/permission danger-full-access' },
    ])
  })
  it('rechecks session identity and running state after the confirmation opens', async () => {
    const state = createState()
    render(state).selectPermission('danger-full-access')
    render({ ...state, status: 'running' })
    mocks.alert.mock.calls[0][2][1].onPress()
    await flush()
    expect(state.client.sendMessage).not.toHaveBeenCalled()
    render(state).selectPermission('danger-full-access')
    render({ ...state, sessionId: 'two' })
    mocks.alert.mock.calls[1][2][1].onPress()
    await flush()
    expect(state.client.sendMessage).not.toHaveBeenCalled()
  })
  it('ignores current values and prevents two immediate permission/model/preset submissions', async () => {
    const state = createState()
    const selection = render(state)
    selection.selectPermission('workspace-write')
    expect(state.client.sendMessage).not.toHaveBeenCalled()
    selection.selectPermission('read-only')
    selection.selectPermission('read-only')
    selection.selectModel({ provider: 'a', model: 'b' })
    selection.selectPreset('ptc')
    await flush()
    expect(state.client.sendMessage).toHaveBeenCalledTimes(1)
    expect(state.client.selectSessionModel).not.toHaveBeenCalled()
    expect(state.client.selectSessionPreset).not.toHaveBeenCalled()
  })
  it.each(['disconnected', 'connecting'] as const)(
    'locks an idle cached session while %s and unlocks after reconnection',
    async (status) => {
      const state = createState()
      mocks.syncStatus = status
      const disconnected = render(state)
      expect(disconnected.permissionLocked).toBe(true)
      disconnected.selectPermission('read-only')
      expect(state.client.sendMessage).not.toHaveBeenCalled()
      mocks.syncStatus = 'connected'
      const connected = render(state)
      expect(connected.permissionLocked).toBe(false)
      connected.selectPermission('read-only')
      await flush()
      expect(state.client.sendMessage).toHaveBeenCalledTimes(1)
    },
  )
  it('rechecks stream connectivity when full access is confirmed', async () => {
    const state = createState()
    render(state).selectPermission('danger-full-access')
    mocks.syncStatus = 'disconnected'
    render(state)
    mocks.alert.mock.calls[0][2][1].onPress()
    await flush()
    expect(state.client.sendMessage).not.toHaveBeenCalled()
  })
  it('recovers when another native alert swallows the prompt, and ignores the expired confirmation', async () => {
    vi.useFakeTimers()
    const state = createState()
    const selection = render(state)
    selection.selectPermission('danger-full-access')
    const expired = mocks.alert.mock.calls[0][2][1].onPress
    selection.selectPermission('read-only')
    expect(state.client.sendMessage).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(PERMISSION_CONFIRMATION_TIMEOUT)
    selection.selectPermission('danger-full-access')
    const current = mocks.alert.mock.calls[1][2][1].onPress
    expired()
    expect(state.client.sendMessage).not.toHaveBeenCalled()
    current()
    current()
    await vi.advanceTimersByTimeAsync(0)
    expect(state.client.sendMessage).toHaveBeenCalledExactlyOnceWith('one', [
      { type: 'text', text: '/permission danger-full-access' },
    ])
  })
  it('releases the gate if the native Alert throws without sending full-access', async () => {
    const state = createState()
    mocks.alert.mockImplementationOnce(() => {
      throw new Error('Native presenter unavailable')
    })
    const selection = render(state)
    selection.selectPermission('danger-full-access')
    expect(state.client.sendMessage).not.toHaveBeenCalled()
    selection.selectPermission('read-only')
    await flush()
    expect(state.client.sendMessage).toHaveBeenCalledExactlyOnceWith('one', [
      { type: 'text', text: '/permission read-only' },
    ])
  })
})
