import { beforeEach, describe, expect, it, vi } from 'vitest'
const storage = vi.hoisted(() => ({ loadConnection: vi.fn(), saveConnection: vi.fn(), clearConnection: vi.fn() }))
vi.mock('@/api/connection-store', () => storage)
import { useConnectionStore } from '@/state/connection'

beforeEach(() => {
  vi.resetAllMocks()
  useConnectionStore.setState({ initialized: false, initializationError: undefined, connection: undefined })
})

describe('connection startup', () => {
  it('leaves the spinner on storage failure and supports a successful retry', async () => {
    storage.loadConnection.mockRejectedValueOnce(new Error('Keychain unavailable')).mockResolvedValueOnce(undefined)
    await useConnectionStore.getState().initialize()
    expect(useConnectionStore.getState()).toMatchObject({ initialized: true, initializationError: expect.any(String) })
    await useConnectionStore.getState().initialize()
    expect(useConnectionStore.getState()).toMatchObject({ initialized: true, initializationError: undefined })
  })

  it('shares one pending restore across concurrent initialization calls', async () => {
    storage.loadConnection.mockResolvedValue(undefined)
    await Promise.all([useConnectionStore.getState().initialize(), useConnectionStore.getState().initialize()])
    expect(storage.loadConnection).toHaveBeenCalledTimes(1)
  })
})
