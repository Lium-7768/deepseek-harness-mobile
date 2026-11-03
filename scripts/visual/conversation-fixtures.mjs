/** Full synthetic transcripts for checking the same conversation states on every native build. */
export function conversationFixtures(now) {
  const user = (text) => ({ type: 'user/message', data: { content: [{ type: 'text', text }] } })
  const start = (turn) => ({ type: 'turn/start', data: { turn } })
  const answer = (turn, step, text, reasoning) => ({
    type: 'assistant/message',
    data: {
      turn,
      step,
      message: {
        id: `fixture-${turn}-${step}`,
        content: [...(reasoning ? [{ type: 'reasoning', text: reasoning }] : []), { type: 'text', text }],
      },
    },
  })
  const call = (turn, step, callId, name, args) => ({
    type: 'tool/call',
    data: { turn, step, callId, name, arguments: JSON.stringify(args) },
  })
  const result = (callId, text, isError = false) => ({
    type: 'tool/result',
    data: {
      message: {
        source: { callId },
        content: [{ type: 'tool-result', isError, content: [{ type: 'text', text }] }],
      },
    },
  })
  const end = (turn, reason = { kind: 'completed' }) => ({ type: 'turn/end', data: { turn, reason } })
  const retry = {
    type: 'llm/retry',
    data: {
      retry: 1,
      maxRetries: 5,
      delayMs: 1200,
      failure: { message: 'The upstream service is temporarily unavailable.' },
    },
  }
  const sequence = (items) =>
    items.map((event, index) => ({ seq: index + 1, event: { ...event, time: now - 180_000 + index * 1500 } }))
  return {
    'conversation-full': sequence([
      user('检查这个项目的移动端体验，先看实现，再给我调整建议。'),
      start(1),
      call(1, 1, 'read', 'read', { file_path: 'README.md' }),
      result('read', 'Expo / React Native companion app.\nUI → Gateway → Desktop runtime'),
      answer(
        1,
        1,
        '先核对连接、会话和输入区，再检查工具执行过程。',
        '需要保留原生导航与键盘行为，同时沿用桌面端的视觉层级。',
      ),
      call(1, 2, 'search', 'grep', { pattern: 'KeyboardAvoidingView', path: 'src/features' }),
      result('search', 'session/session-screen.tsx\nconnection/connect-screen.tsx\nsubagent/subagent-screen.tsx'),
      retry,
      call(1, 3, 'write', 'edit', {
        file_path: 'src/theme/layout.ts',
        old_string: 'const gap = 24',
        new_string: 'const gap = 16',
      }),
      result('write', 'Updated layout.ts'),
      answer(
        1,
        3,
        '## 检查结果\n\n**交互已经可用，阅读层级仍需收紧。** 建议优先统一过程行与正文的间距。\n\n### 建议调整\n\n- 保留手机上的 15px 正文和独立发送按钮。\n- 将已完成回合的过程收起，回答保持可见。\n- 工具详情展开后留在原来的位置。\n\n```ts\nconst conversation = { bodySize: 15, processGap: 4, responseGap: 12, keepNativeKeyboard: true }\nconsole.log(conversation)\n```\n\n| 区域 | 建议 |\n| --- | --- |\n| 消息 | 统一阅读宽度 |\n| 工具 | 稳定的折叠状态 |\n\n> 保持桌面端简洁的层次，同时适配手机触控。\n\n更多说明见 [React Native 文档](https://reactnative.dev/)。',
      ),
      end(1),
      user('把过程展开后再检查一下，尤其是连续工具调用和代码块。'),
      start(2),
      call(2, 1, 'bash', 'bash', { command: 'pnpm typecheck' }),
      result('bash', 'TypeScript: no errors.'),
      answer(2, 1, '已检查连续工具行、长代码和回合尾部。\n\n下一轮可以继续核对深色模式。'),
      end(2),
    ]),
    'conversation-failure': sequence([
      user('运行检查，遇到问题时把失败原因展示出来。'),
      start(1),
      answer(1, 1, '正在读取配置并运行检查。', '先确认工作区权限，再执行验证。'),
      call(1, 2, 'failed-call', 'bash', { command: 'pnpm verify' }),
      result('failed-call', 'Error: upstream connection timed out', true),
      retry,
      { ...retry, data: { ...retry.data, retry: 2, delayMs: 5000 } },
      end(1, { kind: 'error', error: { code: 'TIMEOUT', message: '桌面端暂时无法连接模型服务，请检查连接后重试。' } }),
    ]),
    'conversation-running': sequence([
      user('继续检查对话的显示效果。'),
      start(1),
      answer(1, 1, '已读取主题和对话组件，接下来检查工具详情。', '先比较完整回合中的信息层级。'),
      call(1, 2, 'pending-call', 'read', { file_path: 'src/components/native-tool-card.tsx' }),
    ]),
  }
}
