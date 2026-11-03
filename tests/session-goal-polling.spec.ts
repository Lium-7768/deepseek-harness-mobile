import { createElement } from 'react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from './support/native-testing'
import type { MobileApi } from '@/api/mobile-api'
import type { MobileGoalView } from '@/types/mobile'
import { queryKeys } from '@/api/query-keys'

const mocks = vi.hoisted(() => ({ active: true, options: [] as Array<Record<string, any>> }))
vi.mock('@/hooks/use-screen-active', () => ({ useScreenActive: () => mocks.active }))
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQueryClient: () => ({}),
    useQuery: (options: Record<string, any>) => {
      mocks.options.push(options)
      return { data: undefined }
    },
  }
})
import { useSessionQueries } from '@/features/session/use-session-queries'
const connection = { gatewayUrl: 'https://desktop.test', deviceId: 'phone', accessToken: 'token' }
const liveGoal: MobileGoalView = { id: 'goal', revision: 1, objective: 'Review', phase: 'active' }

beforeEach(() => {
  mocks.active = true
  mocks.options = []
})
afterEach(cleanup)
async function options(client?: MobileApi) {
  function Harness() {
    useSessionQueries(client, connection, 'one')
    return null
  }
  await render(createElement(Harness))
  return mocks.options.findLast(
    (option) => JSON.stringify(option.queryKey) === JSON.stringify(queryKeys.sessionGoal('one')),
  )!
}
describe('live Goal read scheduling', () => {
  it('reads once on a focused session, but does not poll an absent, completed or unknown Goal', async () => {
    const read = vi.fn().mockResolvedValue({ goal: null })
    const client = { withSignal: vi.fn(), sessionGoal: read }
    client.withSignal.mockReturnValue(client)
    const goal = await options(client as unknown as MobileApi)
    expect(goal.enabled).toBe(true)
    const signal = new AbortController().signal
    await goal.queryFn({ signal })
    expect(client.withSignal).toHaveBeenCalledWith(signal)
    expect(read).toHaveBeenCalledExactlyOnceWith('one')
    for (const data of [undefined, { goal: null }, { goal: { ...liveGoal, phase: 'complete' } }])
      expect(goal.refetchInterval({ state: { data } })).toBe(false)
    for (const phase of ['active', 'paused', 'blocked'])
      expect(goal.refetchInterval({ state: { data: { goal: { ...liveGoal, phase } } } })).toBe(5000)
  })
  it('disables background polling and resumes when a streamed creation supplies live Goal data', async () => {
    const client = {} as MobileApi
    mocks.active = false
    const background = await options(client)
    expect(background.enabled).toBe(false)
    expect(background.refetchInterval({ state: { data: { goal: liveGoal } } })).toBe(false)
    mocks.active = true
    const foreground = await options(client)
    expect(foreground.refetchInterval({ state: { data: { goal: null } } })).toBe(false)
    expect(foreground.refetchInterval({ state: { data: { goal: liveGoal } } })).toBe(5000)
    expect((await options(undefined)).enabled).toBe(false)
  })
})
