import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MobileApi,
  MobileApiError,
  mobileAuthorization,
  mobileErrorMessage,
  redeemMobilePairing,
} from '../src/api/mobile-api.ts'

const connection = { gatewayUrl: 'http://127.0.0.1:52404', deviceId: 'device-1', accessToken: 'token-1' }

describe('MobileApi authentication', () => {
  it('uses the paired device ID together with its token for every gateway credential', () => {
    expect(mobileAuthorization(connection)).toBe('Bearer device-1.token-1')
  })
})

describe('MobileApi error presentation', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let warning: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warning.mockRestore()
    vi.unstubAllGlobals()
  })

  it('maps rejected network requests to Chinese UI text and keeps the raw diagnostic', async () => {
    fetchMock.mockRejectedValue(new Error('Failed to fetch'))

    const error = await requestError(() => new MobileApi(connection).listSessions())

    expect(error).toBeInstanceOf(MobileApiError)
    expect(error).toMatchObject({
      kind: 'network',
      userMessage: '无法连接桌面端，请检查网络或网关地址。',
      diagnostic: { rawMessage: 'Failed to fetch' },
    })
  })

  it('maps English credential faults without exposing their message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'unauthorized', message: 'Unauthorized' } }, 401))

    const error = await requestError(() => new MobileApi(connection).listSessions())

    expect(error).toMatchObject({
      kind: 'credentials',
      userMessage: '移动端凭据无效，请重新连接桌面端。',
      diagnostic: { code: 'unauthorized', status: 401, rawMessage: 'Unauthorized' },
    })
  })

  it('preserves an already Chinese gateway fault message', async () => {
    const message = '桌面端 DeepSeek Harness 当前不可用。'
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'upstream-unavailable', message } }, 502))

    const error = await requestError(() => new MobileApi(connection).listSessions())

    expect(error).toMatchObject({
      kind: 'desktop-unavailable',
      userMessage: message,
      diagnostic: { rawMessage: message },
    })
  })

  it('classifies unknown HTTP faults and invalid successful envelopes', async () => {
    fetchMock.mockResolvedValueOnce(new Response('backend failure', { status: 500 }))
    const httpError = await requestError(() => new MobileApi(connection).listSessions())
    expect(httpError).toMatchObject({ kind: 'http', userMessage: '移动端连接请求失败（HTTP 500），请稍后重试。' })

    fetchMock.mockResolvedValueOnce(jsonResponse({ contractVersion: 2, data: {} }, 200))
    const protocolError = await requestError(() => new MobileApi(connection).listSessions())
    expect(protocolError).toMatchObject({ kind: 'protocol', userMessage: '桌面端返回了无效响应，请稍后重试。' })
  })

  it('does not expose unknown English errors through the shared UI helper', () => {
    expect(mobileErrorMessage(new Error('Network request failed'), '连接失败，请稍后重试。')).toBe(
      '连接失败，请稍后重试。',
    )
    expect(mobileErrorMessage(new Error('桌面端当前不可用。'), '连接失败，请稍后重试。')).toBe('桌面端当前不可用。')
  })
})

describe('Mobile QR pairing redemption', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exchanges a valid desktop QR payload without requiring an existing device credential', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ contractVersion: 1, data: { deviceId: 'phone-1', accessToken: 'token-1' } }, 200),
    )

    await expect(
      redeemMobilePairing({
        version: 1,
        gatewayUrl: 'https://desktop.example.test/mobile/',
        pairingId: 'pairing-1',
        pairingSecret: 'secret-1',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).resolves.toEqual({
      gatewayUrl: 'https://desktop.example.test/mobile',
      deviceId: 'phone-1',
      accessToken: 'token-1',
    })

    expect(fetchMock).toHaveBeenCalledWith('https://desktop.example.test/mobile/v1/pairing/redeem', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pairingId: 'pairing-1', pairingSecret: 'secret-1' }),
      signal: expect.any(AbortSignal),
    })
  })

  it('rejects expired and already-used desktop pairing codes with recoverable Chinese messages', async () => {
    const expired = await requestError(() =>
      redeemMobilePairing({
        version: 1,
        gatewayUrl: 'https://desktop.example.test',
        pairingId: 'pairing-1',
        pairingSecret: 'secret-1',
        expiresAt: new Date(Date.now() - 1_000).toISOString(),
      }),
    )
    expect(expired).toMatchObject({ kind: 'pairing-invalid', userMessage: '该配对二维码已过期，请在桌面端重新生成。' })
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: 'pairing-not-found', message: 'Used' } }, 404))
    const used = await requestError(() =>
      redeemMobilePairing({
        version: 1,
        gatewayUrl: 'https://desktop.example.test',
        pairingId: 'pairing-1',
        pairingSecret: 'secret-1',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    )
    expect(used).toMatchObject({
      kind: 'pairing-invalid',
      userMessage: '该配对二维码无效、已使用或已过期，请在桌面端重新生成。',
      diagnostic: { code: 'pairing-not-found', status: 404, rawMessage: 'Used' },
    })
  })
})

describe('MobileApi capability requests', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ contractVersion: 1, data: {} }, 200)))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the gateway paths and request bodies for settings, model, and preset operations', async () => {
    const api = new MobileApi(connection)
    await api.settingsDescribe()
    await api.settingsUpdate({ ns: 'locale', patch: { locale: 'zh-CN' }, expectedRevision: 2 })
    await api.settingsMutate({ ns: 'permission', ops: [{ op: 'set', path: ['mode'], value: 'read-only' }] })
    await api.llmProviders()
    await api.llmModels()
    await api.sessionModels('session/a')
    await api.selectSessionModel('session/a', { provider: 'deepseek', model: 'chat', reasoningEffort: 'high' })
    await api.agentPresets()
    await api.agentPreset('preset/main')
    await api.selectSessionPreset('session/a', 'preset/main')

    const calls = fetchMock.mock.calls as Array<[string, RequestInit]>
    expect(
      calls.map(([url, init]) => ({
        url: new URL(url).pathname,
        body: JSON.parse(String(init.body)),
      })),
    ).toEqual([
      { url: '/v1/settings/describe', body: {} },
      { url: '/v1/settings/update', body: { ns: 'locale', patch: { locale: 'zh-CN' }, expectedRevision: 2 } },
      {
        url: '/v1/settings/mutate',
        body: { ns: 'permission', ops: [{ op: 'set', path: ['mode'], value: 'read-only' }] },
      },
      { url: '/v1/llm/providers', body: {} },
      { url: '/v1/llm/models', body: {} },
      { url: '/v1/sessions/session%2Fa/models', body: {} },
      { url: '/v1/sessions/session%2Fa/model', body: { provider: 'deepseek', model: 'chat', reasoningEffort: 'high' } },
      { url: '/v1/agent-presets/list', body: {} },
      { url: '/v1/agent-presets/read', body: { agentPreset: 'preset/main' } },
      { url: '/v1/sessions/session%2Fa/agent-preset', body: { agentPreset: 'preset/main' } },
    ])
  })

  it('reads running sessions and creates one encoded session subscription through the paired Gateway', async () => {
    const api = new MobileApi(connection)
    await api.runningSessions()
    await api.createSessionSubscription('session/a', 42)
    await api.activateSessionSubscription('subscription/a', 'activation-token', 43)

    const calls = fetchMock.mock.calls as Array<[string, RequestInit]>
    expect(
      calls.map(([url, init]) => ({
        url: new URL(url).pathname,
        body: JSON.parse(String(init.body)),
        authorization: new Headers(init.headers).get('authorization'),
      })),
    ).toEqual([
      {
        url: '/v1/sessions/running',
        body: {},
        authorization: 'Bearer device-1.token-1',
      },
      {
        url: '/v1/sessions/session%2Fa/subscriptions',
        body: { lastSeenSeq: 42 },
        authorization: 'Bearer device-1.token-1',
      },
      {
        url: '/v1/subscriptions/subscription%2Fa/activate',
        body: { activationToken: 'activation-token', appliedSnapshotSeq: 43 },
        authorization: 'Bearer device-1.token-1',
      },
    ])
  })

  it.each([
    ['session-not-found', 404, 'session-not-found', '未找到请求的会话或操作。'],
    ['model-unavailable', 400, 'model-unavailable', '所选模型当前不可用，请重新选择。'],
    ['agent-preset-locked', 400, 'agent-preset-locked', '会话已经开始，无法切换 Agent 模式。'],
    ['agent-preset-not-found', 404, 'agent-preset-not-found', '未找到所选 Agent 预设。'],
    ['settings-conflict', 409, 'settings-conflict', '设置已被其他窗口修改，请重新加载后再试。'],
  ] as const)('maps %s gateway faults to localized diagnostics', async (code, status, kind, userMessage) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code, message: 'English upstream detail' } }, status))

    const error = await requestError(() => new MobileApi(connection).listSessions())

    expect(error).toMatchObject({
      kind,
      userMessage,
      diagnostic: { code, status, rawMessage: 'English upstream detail' },
    })
  })
})

async function requestError(request: () => Promise<unknown>): Promise<MobileApiError> {
  try {
    await request()
  } catch (error) {
    if (error instanceof MobileApiError) return error
    throw error
  }
  throw new Error('expected request to fail')
}

function jsonResponse(value: unknown, status: number): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
}

describe('MobileApi agent observation and control requests', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ contractVersion: 1, data: {} }, 200)))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the constrained Gateway paths for jobs, subagents, and goal mutations', async () => {
    const api = new MobileApi(connection)
    await api.sessionJobs('parent/a')
    await api.subagents('parent/a')
    await api.subagentHistory('parent/a', 'child/a', 'continuable')
    await api.sendSubagentMessage('parent/a', 'child/a', [{ type: 'text', text: 'Continue the task.' }])
    await api.interruptSubagent('parent/a', 'child/a')
    fetchMock.mockResolvedValueOnce(jsonResponse({ contractVersion: 1, data: { goal: null } }, 200))
    await api.sessionGoal('parent/a')
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ contractVersion: 1, data: { ref: { id: 'goal-1', revision: 1 } } }, 200),
    )
    await api.createGoal('parent/a', 'Complete the review.')
    fetchMock.mockResolvedValueOnce(jsonResponse({ contractVersion: 1, data: { id: 'goal-1', revision: 4 } }, 200))
    await api.mutateGoal('parent/a', 'pause', { id: 'goal-1', revision: 3 })
    fetchMock.mockResolvedValueOnce(jsonResponse({ contractVersion: 1, data: { id: 'goal-1', revision: 4 } }, 200))
    await api.mutateGoal('parent/a', 'edit', { id: 'goal-1', revision: 3 }, { objective: 'Complete the review.' })

    const calls = fetchMock.mock.calls as Array<[string, RequestInit]>
    expect(
      calls.map(([url, init]) => ({
        url: new URL(url).pathname,
        body: JSON.parse(String(init.body)),
      })),
    ).toEqual([
      { url: '/v1/sessions/parent%2Fa/jobs', body: {} },
      { url: '/v1/sessions/parent%2Fa/subagents', body: {} },
      { url: '/v1/sessions/parent%2Fa/subagents/child%2Fa/history', body: { mode: 'continuable' } },
      {
        url: '/v1/sessions/parent%2Fa/subagents/child%2Fa/messages',
        body: { mode: 'continuable', content: [{ type: 'text', text: 'Continue the task.' }] },
      },
      { url: '/v1/sessions/parent%2Fa/subagents/child%2Fa/interrupt', body: { mode: 'continuable' } },
      { url: '/v1/sessions/parent%2Fa/goal/read', body: {} },
      { url: '/v1/sessions/parent%2Fa/goal/create', body: { objective: 'Complete the review.' } },
      { url: '/v1/sessions/parent%2Fa/goal/pause', body: { ref: { id: 'goal-1', revision: 3 } } },
      {
        url: '/v1/sessions/parent%2Fa/goal/edit',
        body: { ref: { id: 'goal-1', revision: 3 }, objective: 'Complete the review.' },
      },
    ])
  })
})

describe('MobileApi safe search and attachment reads', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ contractVersion: 1, data: {} }, 200)))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses constrained authenticated routes for desktop search snippets and session-authorized images', async () => {
    const api = new MobileApi(connection)
    await api.searchSessions('search phrase')
    await api.readAttachment('session/a', 'attachment/a')

    const calls = fetchMock.mock.calls as Array<[string, RequestInit]>
    expect(
      calls.map(([url, init]) => ({
        url: new URL(url).pathname,
        headers: init.headers,
        body: JSON.parse(String(init.body)),
      })),
    ).toEqual([
      {
        url: '/v1/sessions/search',
        headers: { authorization: 'Bearer device-1.token-1', 'content-type': 'application/json' },
        body: { query: 'search phrase' },
      },
      {
        url: '/v1/sessions/session%2Fa/attachments/attachment%2Fa',
        headers: { authorization: 'Bearer device-1.token-1', 'content-type': 'application/json' },
        body: {},
      },
    ])
  })
})

describe('desktop automation and archive management boundary', () => {
  it('forwards only the selected versioned schedule action and encoded restore identity', async () => {
    const calls: { path: string; body: unknown }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ path: new URL(url).pathname, body: JSON.parse(String(init.body)) })
        return jsonResponse({ contractVersion: 1, data: url.endsWith('/catalog') ? { items: [] } : {} }, 200)
      }),
    )
    try {
      const api = new MobileApi(connection)
      await api.unarchiveSession('a/b')
      await api.schedules()
      await api.updateSchedule(
        {
          id: 'task/a',
          title: 'title',
          prompt: 'prompt',
          status: 'active',
          scheduledAt: '',
          updatedAt: 'v1',
          target: { kind: 'new' },
        },
        'pause',
      )
      expect(calls).toEqual([
        { path: '/v1/sessions/a%2Fb/unarchive', body: {} },
        { path: '/v1/schedules/catalog', body: {} },
        { path: '/v1/schedules/task%2Fa/pause', body: { expectedUpdatedAt: 'v1' } },
      ])
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('rejects a malformed catalog and optimistic update conflicts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ contractVersion: 1, data: { code: 'schedule_conflict' } }, 200)),
    )
    try {
      const api = new MobileApi(connection)
      await expect(api.schedules()).rejects.toThrow()
      await expect(
        api.updateSchedule(
          { id: 'task', title: 'title', prompt: 'prompt', status: 'paused', scheduledAt: '', target: { kind: 'new' } },
          'resume',
        ),
      ).rejects.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('Goal and schedule response validation', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  it.each([null, false, 1, 'goal', [], {}, { phase: 'active' }, { id: 'g', revision: 1, phase: 'unknown' }])(
    'rejects invalid Goal mutations as protocol errors: %j',
    async (data) => {
      fetchMock.mockResolvedValue(jsonResponse({ contractVersion: 1, data }, 200))
      await expect(
        new MobileApi(connection).mutateGoal('one', 'pause', { id: 'g', revision: 1 }),
      ).rejects.toMatchObject({ kind: 'protocol' })
    },
  )
  it('accepts full views and the desktop CAS reference returned by clear', async () => {
    const api = new MobileApi(connection)
    const ref = { id: 'g', revision: 2 }
    const goal = { ...ref, objective: 'Fix the review', phase: 'paused', activation: 'disarmed' }
    for (const [action, data] of [
      ['pause', goal],
      ['edit', ref],
      ['clear', ref],
    ] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse({ contractVersion: 1, data }, 200))
      await expect(api.mutateGoal('one', action, { id: 'g', revision: 1 })).resolves.toEqual(data)
    }
  })
  it('validates Goal read/create responses before marking mutations successful', async () => {
    const api = new MobileApi(connection)
    for (const data of [null, {}, { goal: false }, { goal: { id: 'g', revision: 1, phase: 'active' } }]) {
      fetchMock.mockResolvedValueOnce(jsonResponse({ contractVersion: 1, data }, 200))
      await expect(api.sessionGoal('one')).rejects.toMatchObject({ kind: 'protocol' })
    }
    for (const data of [null, {}, { ref: { id: 'g', revision: 0 } }]) {
      fetchMock.mockResolvedValueOnce(jsonResponse({ contractVersion: 1, data }, 200))
      await expect(api.createGoal('one', 'objective')).rejects.toMatchObject({ kind: 'protocol' })
    }
  })
  it('rejects a non-contract cleared flag rather than accepting a fake GoalRef', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ contractVersion: 1, data: { cleared: true } }, 200))
    await expect(new MobileApi(connection).mutateGoal('one', 'clear', { id: 'g', revision: 1 })).rejects.toMatchObject({
      kind: 'protocol',
    })
  })
  it.each([
    ['schedule_not_found', 'schedule-not-found', '该任务已被桌面端删除'],
    ['schedule_conflict', 'schedule-conflict', '任务已被修改'],
    ['unrecognized', 'protocol', '桌面端返回了无效响应'],
  ])('distinguishes the %s schedule action result', async (code, kind, text) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ contractVersion: 1, data: { id: 'task', code } }, 200))
    await expect(
      new MobileApi(connection).updateSchedule(
        { id: 'task', title: 'Task', prompt: 'prompt', status: 'active', scheduledAt: '', target: { kind: 'new' } },
        'pause',
      ),
    ).rejects.toMatchObject({ kind, userMessage: expect.stringContaining(text) })
  })
  it.each([null, {}, { items: null }, { items: [null] }, { items: [{ id: 'task', target: null }] }])(
    'reports malformed catalogs as protocol failures, never unsupported: %j',
    async (data) => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ contractVersion: 1, data }, 200))
      await expect(new MobileApi(connection).schedules()).rejects.toMatchObject({ kind: 'protocol' })
    },
  )
  it.each([
    [404, 'not-found', 'unsupported'],
    [501, 'schedule-unsupported', 'unsupported'],
    [404, 'session-not-found', 'session-not-found'],
    [401, 'unauthorized', 'credentials'],
    [503, 'upstream-unavailable', 'desktop-unavailable'],
  ])('classifies the catalog HTTP %s / %s failure as %s', async (status, code, kind) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code, message: 'Upstream failure' } }, status as number))
    await expect(new MobileApi(connection).schedules()).rejects.toMatchObject({
      kind,
      diagnostic: { kind, code, status },
    })
  })
})
