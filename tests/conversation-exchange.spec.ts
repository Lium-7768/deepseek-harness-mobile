import { expect, it } from 'vitest'
import { projectNativeConversationRows } from '../src/components/session-conversation-logic.ts'

it('projects a complete user, tool and assistant exchange without local session data', () => {
  const rows = projectNativeConversationRows([
    { seq: 1, event: { type: 'user/message', data: { content: [{ type: 'text', text: '读取项目说明' }] } } },
    {
      seq: 2,
      event: { type: 'tool/call', data: { callId: 'read-1', name: 'read', arguments: '{"file_path":"README.md"}' } },
    },
    {
      seq: 3,
      event: {
        type: 'tool/result',
        data: {
          message: {
            source: { callId: 'read-1' },
            content: [{ type: 'tool-result', content: [{ type: 'text', text: 'Project description' }] }],
          },
        },
      },
    },
    {
      seq: 4,
      event: {
        type: 'assistant/message',
        data: { message: { content: [{ type: 'text', text: '这是移动客户端。' }] } },
      },
    },
  ])
  expect(rows.map((row) => row.kind)).toEqual(['user', 'tool', 'assistant'])
  expect(rows.at(-1)).toMatchObject({ text: '这是移动客户端。' })
})
