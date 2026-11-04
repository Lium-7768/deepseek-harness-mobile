import { conversationFixtures } from './conversation-fixtures.mjs'
/** Local-only visual fixture. Synthetic data; never contacts a model or a desktop runtime. */
import { createServer } from 'node:http'

const port = Number(process.env.MOBILE_FIXTURE_PORT ?? 8094)
const now = Date.now()
const events = [
  { type: 'turn/start', data: { turn: 1 }, time: now - 30_000 },
  {
    type: 'user/message',
    data: { content: [{ type: 'text', text: '检查一下这个项目的界面和运行状态。' }] },
    time: now - 29_000,
  },
  {
    type: 'tool/call',
    data: {
      turn: 1,
      step: 1,
      callId: 'read',
      name: 'read',
      description: '读取项目说明',
      arguments: '{"file_path":"README.md"}',
    },
  },
  {
    type: 'tool/result',
    data: {
      message: {
        source: { callId: 'read' },
        content: [{ type: 'tool-result', content: [{ type: 'text', text: 'Expo / React Native companion app.' }] }],
      },
    },
  },
  {
    type: 'assistant/message',
    data: {
      turn: 1,
      step: 1,
      message: {
        content: [
          { type: 'reasoning', text: '先核对页面层级和原生交互，再检查连接状态。' },
          {
            type: 'text',
            text: '项目结构清晰，已经完成第一轮检查。\n\n### 本轮调整\n\n- 统一了标题、正文与辅助信息的层级。\n- 改善了手机上的键盘、留白与触控体验。\n- 保留桌面端简洁的色彩和圆角。\n\n```ts\nconst connected = status === "connected"\n```\n\n接下来可以继续验证深色模式和长对话。',
          },
        ],
      },
    },
    time: now - 10_000,
  },
  { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } }, time: now - 5000 },
].map((event, index) => ({ seq: index + 1, event }))
const transcripts = conversationFixtures(now)
const goalFixtures = new Map(
  ['active', 'paused', 'blocked', 'complete'].map((phase) => [
    `goal-${phase}`,
    {
      id: `fixture-${phase}`,
      revision: 1,
      objective: '从总池与新建目标中拿到 20 个非重复成果，并检查完整的移动端对话界面。',
      phase,
      activation: phase === 'active' ? 'armed' : 'disarmed',
      ...(phase === 'blocked'
        ? { blockedReason: { code: 'needs-input', message: '需要补充可访问的资料后才能继续。' } }
        : {}),
    },
  ]),
)
goalFixtures.set('goal-disarmed', {
  id: 'fixture-disarmed',
  revision: 1,
  objective: '恢复已停止自动续跑的目标',
  phase: 'active',
  activation: 'disarmed',
})
const list = {
  items: [
    { sessionId: 'model-unavailable', title: '模型不可用状态', updatedAt: now, blank: false },
    { sessionId: 'search-local', title: '搜索示例 · local', updatedAt: now - 1000, blank: false },
    { sessionId: 'search-content', title: '数据层审查', updatedAt: now - 2000, blank: false },
    { sessionId: 'search-archived', title: '归档示例 · archived', updatedAt: now - 3000, blank: false },
    ...[...goalFixtures.keys(), 'goal-absent'].map((sessionId) => ({
      sessionId,
      title: `目标栏 · ${sessionId}`,
      updatedAt: now,
      agentPreset: 'standard',
      running: false,
      blank: false,
    })),
    ...Object.keys(transcripts).map((sessionId) => ({
      sessionId,
      title: {
        'conversation-full': '完整对话 · 多回合',
        'conversation-failure': '失败与重试',
        'conversation-running': '运行中的对话',
      }[sessionId],
      updatedAt: now,
      agentPreset: 'standard',
      running: sessionId.endsWith('running'),
      blank: false,
    })),
    {
      sessionId: 'design-review',
      title: '检查界面与运行状态',
      updatedAt: now,
      agentPreset: 'standard',
      running: false,
      blank: false,
    },
    {
      sessionId: 'blank',
      title: '新的想法',
      updatedAt: now - 3600_000,
      agentPreset: 'standard',
      running: false,
      blank: true,
    },
  ],
  workspaces: [
    {
      workspaceId: 'nested-review',
      title: '源代码',
      path: '/projects/mobile/src',
      sessionIds: ['search-local', 'search-content', 'search-archived'],
    },
    {
      workspaceId: 'mobile',
      title: 'deepseek-harness-mobile',
      path: '/projects/mobile',
      sessionIds: [...Object.keys(transcripts), 'design-review', 'blank'],
    },
  ],
  archivedSessionIds: ['search-archived'],
}
let effectivePermission = 'workspace-write'
const fixtureCommands = []
const schedules = [
  {
    id: 'fixture-schedule',
    title: '每日界面检查',
    prompt: '检查项目状态并生成简报。',
    status: 'active',
    scheduledAt: new Date(now + 86400000).toISOString(),
    updatedAt: new Date(now).toISOString(),
    target: { kind: 'session', sessionId: 'conversation-full' },
  },
]
const models = {
  current: { provider: 'deepseek', model: 'DeepSeek-V4.1', reasoningEffort: 'high' },
  routable: true,
  failures: [],
  groups: [
    {
      id: 'deepseek',
      name: 'DeepSeek',
      models: [
        {
          id: 'DeepSeek-V4.1',
          name: 'DeepSeek-V4.1',
          description: '通用推理模型',
          reasoning: {
            defaultEffort: 'high',
            efforts: [
              { id: 'low', name: '低' },
              { id: 'medium', name: '中' },
              { id: 'high', name: '高' },
              { id: 'max', name: '极高' },
            ],
          },
        },
        { id: 'DeepSeek-V4.1-Fast', name: 'DeepSeek-V4.1-Fast' },
        ...Array.from({ length: 30 }, (_, index) => ({
          id: `visual/provider/model-${index + 1}`,
          name: `Visual reasoning model ${index + 1}`,
        })),
      ],
    },
  ],
}
const presets = {
  authorable: false,
  hasDocument: true,
  presets: [
    { id: 'standard', name: '标准模式', description: '适合日常开发与复杂任务。', isDefault: true },
    { id: 'plan', name: '计划模式', description: '先分析需求，再给出可执行计划。', isDefault: false },
  ],
}
const namespaces = [
  ['ui-theme', { appearance: 'system' }],
  ['ui-conversation', { fontSize: 14 }],
  ['agent-presets', { default: 'standard' }],
  ['permission', { defaultPreset: 'workspace-write' }],
  ['agent-default-model', { provider: 'deepseek', model: 'DeepSeek-V4.1' }],
  ['subagent', { concurrency: 3 }],
  ['web-search', { enabled: true }],
].map(([ns, value]) => ({ ns, value, schema: {}, applies: 'live', secrets: [], revision: 1 }))
const history = {
  items: events,
  hasMore: false,
  projections: {
    asOfSeq: events.length,
    values: {
      permissions: { currentValue: 'workspace-write' },
      sessionStats: {
        turns: 2,
        steps: 5,
        llmMs: 27000,
        toolMs: 6000,
        ttftMs: 5000,
        ttftSteps: 2,
        decodeMs: 15000,
        decodeTokens: 1200,
      },
      tokenUsage: { uncachedInputTokens: 12000, cacheReadTokens: 48000, cacheWriteTokens: 0, outputTokens: 1400 },
      contextPressure: { pressureTokens: 32000, contextWindow: 128000 },
      // The desktop `todo` dock (conversation.input.dock order 0) reads this key.
      todos: [
        { content: 'Read the desktop diff', status: 'completed' },
        { content: 'Patch the native dock', status: 'in_progress' },
        { content: 'Run the gates', status: 'pending' },
      ],
    },
  },
}
const server = createServer(async (request, response) => {
  const path = new URL(request.url, `http://127.0.0.1:${port}`).pathname
  if (path === '/v1/events') {
    response.writeHead(200, { 'content-type': 'text/event-stream' })
    response.write(
      `data: ${JSON.stringify({ contractVersion: 1, eventId: `${Date.now()}`, type: 'gateway/ready', payload: {} })}\n\n`,
    )
    const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 2500)
    request.on('close', () => clearInterval(heartbeat))
    return
  }
  let body = ''
  for await (const chunk of request) body += chunk
  let input = {}
  try {
    input = JSON.parse(body || '{}')
  } catch {}
  let data
  if (path === '/v1/auth') data = { deviceId: 'visual-review', accessToken: 'synthetic-local-token' }
  else if (path === '/v1/sessions/list') data = list
  else if (path === '/v1/test/commands') data = { commands: fixtureCommands }
  else if (path === '/v1/schedules/catalog') data = { items: schedules }
  else if (/\/v1\/schedules\/[^/]+\/(pause|resume|delete)$/.test(path)) {
    const task = schedules.find((item) => item.id === path.split('/')[3])
    if (!task) data = { code: 'schedule_not_found' }
    else if ((input.expectedUpdatedAt ?? null) !== (task.updatedAt ?? null)) data = { code: 'schedule_conflict' }
    else {
      const action = path.split('/').at(-1)
      if (action === 'delete') {
        schedules.splice(schedules.indexOf(task), 1)
        data = { deleted: true }
      } else {
        task.status = action === 'pause' ? 'paused' : 'active'
        task.updatedAt = new Date().toISOString()
        data = task
      }
    }
  } else if (path.endsWith('/unarchive')) {
    list.archivedSessionIds = list.archivedSessionIds.filter((id) => id !== path.split('/')[3])
    data = { archivedSessionIds: list.archivedSessionIds }
  } else if (path === '/v1/sessions/running') data = { sessionIds: [] }
  else if (path === '/v1/sessions/search') {
    const query = String(input.query ?? '').toLowerCase()
    if (query === 'search-fail') {
      response.writeHead(503, { 'content-type': 'application/json' })
      response.end(
        JSON.stringify({ contractVersion: 1, error: { code: 'unavailable', message: 'Synthetic search failure' } }),
      )
      return
    }
    if (query === 'slow') await new Promise((resolve) => setTimeout(resolve, 1600))
    data = {
      items: list.items.flatMap((item) => {
        const snippet = item.sessionId === 'search-content' ? 'needle：只在历史正文中匹配的内容摘要。' : item.title
        return `${item.sessionId} ${snippet}`.toLowerCase().includes(query)
          ? [{ sessionId: item.sessionId, snippet }]
          : []
      }),
      hasMore: false,
    }
  } else if (path === '/v1/agent-presets/list') data = presets
  else if (path === '/v1/agent-presets/read')
    data = { agentPreset: input.agentPreset, content: 'name: standard\ndescription: Visual review fixture' }
  else if (path === '/v1/settings/describe') data = { namespaces, writable: false, hasDocument: true }
  else if (path === '/v1/llm/models' || path.endsWith('/models'))
    data = path.includes('/model-unavailable/')
      ? {
          ...models,
          groups: [],
          routable: false,
          failures: [{ id: 'down', name: '离线供应商', message: 'Synthetic provider failure' }],
        }
      : models
  else if (path.endsWith('/goal/read')) data = { goal: goalFixtures.get(path.split('/')[3]) ?? null }
  else if (path.endsWith('/goal/create')) {
    const id = path.split('/')[3]
    const current = goalFixtures.get(id)
    if (current && current.phase !== 'complete') {
      response.writeHead(409, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ contractVersion: 1, error: { code: 'conflict', message: '已有目标' } }))
      return
    }
    const goal = {
      id: `created-${Date.now()}`,
      revision: 1,
      objective: input.objective,
      phase: 'active',
      activation: 'armed',
    }
    goalFixtures.set(id, goal)
    data = { ref: { id: goal.id, revision: goal.revision } }
  } else if (/\/goal\/(edit|pause|resume|clear)$/.test(path)) {
    const id = path.split('/')[3]
    const action = path.split('/').at(-1)
    const goal = goalFixtures.get(id)
    if (!goal || input.ref?.id !== goal.id || input.ref?.revision !== goal.revision) {
      response.writeHead(409, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ contractVersion: 1, error: { code: 'conflict', message: '目标已变更' } }))
      return
    }
    if (action === 'clear') {
      goalFixtures.delete(id)
      data = { id: goal.id, revision: goal.revision + 1 }
    } else {
      const next = { ...goal, revision: goal.revision + 1 }
      if (action === 'edit') next.objective = input.objective
      else {
        next.phase = action === 'pause' ? 'paused' : 'active'
        next.activation = action === 'pause' ? 'disarmed' : 'armed'
        delete next.blockedReason
      }
      goalFixtures.set(id, next)
      data = next
    }
  } else if (path.endsWith('/history')) {
    const id = path.split('/')[3]
    data = {
      ...history,
      items: transcripts[id] ?? (id === 'blank' ? [] : events),
      projections: {
        ...history.projections,
        values: {
          ...history.projections.values,
          permissions: { currentValue: effectivePermission },
          ...(goalFixtures.has(id) || id.startsWith('goal-')
            ? { goal: goalFixtures.has(id) ? { goal: goalFixtures.get(id), roundsStarted: 20 } : null }
            : {}),
        },
      },
    }
  } else if (path.endsWith('/events')) {
    const id = path.split('/')[3]
    const transcript = transcripts[id] ?? events
    data = {
      since: transcript.length,
      items: transcript.filter((item) => item.seq > (input.since ?? 0)),
      status: id.endsWith('running') ? 'running' : 'idle',
    }
  } else if (path.includes('/goal-blocked/') && path.endsWith('/queue'))
    data = {
      items: [
        {
          id: 'goal-queue',
          placement: 'queued',
          message: { content: [{ type: 'text', text: '核对目标栏和输入卡之间的队列' }] },
        },
      ],
    }
  else if (
    (path.includes('/conversation-') || path.includes('/goal-')) &&
    (path.endsWith('/subagents') || path.endsWith('/jobs') || path.endsWith('/queue') || path.endsWith('/interactions'))
  )
    data = path.endsWith('/subagents') ? { entries: [], parentAvailable: true } : { items: [] }
  else if (path.endsWith('/subagents'))
    data = {
      entries: [
        {
          kind: 'child',
          id: 'visual-child',
          mode: 'continuable',
          activity: 'inactive',
          hasChildren: false,
          label: '界面检查',
        },
      ],
      parentAvailable: true,
    }
  else if (path.endsWith('/feedback/list')) data = { ok: true, value: { items: [] } }
  else if (path.endsWith('/interactions'))
    data = {
      items: [
        {
          rpcId: 'visual-approval',
          type: 'approval/requested',
          sessionId: 'design-review',
          receivedAt: new Date(now).toISOString(),
          payload: {
            type: 'approval/requested',
            sessionId: 'design-review',
            approvalId: 'review-1',
            toolName: 'write',
            reason: '允许将调整后的界面保存到当前工作区。',
          },
        },
        {
          rpcId: 'visual-question',
          type: 'question/requested',
          sessionId: 'design-review',
          receivedAt: new Date(now).toISOString(),
          payload: {
            type: 'question/requested',
            sessionId: 'design-review',
            questions: [
              {
                id: 'style',
                question: '希望优先调整哪个部分？',
                options: [
                  { label: '对话阅读', description: '正文、工具过程和代码块' },
                  { label: '导航和设置', description: '侧栏、菜单与选择器' },
                ],
              },
            ],
          },
        },
      ],
    }
  else if (path.endsWith('/jobs') || path.endsWith('/queue') || path.endsWith('/interactions')) data = { items: [] }
  else if (path.endsWith('/messages')) {
    fixtureCommands.push({ sessionId: path.split('/')[3], content: input.content })
    const command = input.content?.find((part) => part.type === 'text')?.text
    if (command?.startsWith('/permission ')) effectivePermission = command.slice('/permission '.length)
    await new Promise((resolve) => setTimeout(resolve, 500))
    data = { accepted: true }
  } else if (path.endsWith('/model')) {
    fixtureCommands.push({ sessionId: path.split('/')[3], selection: input })
    models.current = input
    await new Promise((resolve) => setTimeout(resolve, 500))
    data = { selected: models.current }
  } else data = {}
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ contractVersion: 1, data }))
})
server.listen(port, '127.0.0.1', () => console.log(`Synthetic mobile visual fixture: http://127.0.0.1:${port}`))
