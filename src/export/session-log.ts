/**
 * Renders a durable session log as Markdown for the share sheet.
 *
 * Rows come from the same projection the conversation screen draws, so an
 * exported log keeps the distinctions that screen shows: assistant prose and
 * Think are separate sections, a tool call carries its correlated result, and
 * retries, turn errors, and compactions stay visible instead of disappearing.
 */
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import { format, t } from '@/locale'

/** Identity written into the exported file's header. */
export interface SessionLogHeader {
  /** Session title as the drawer shows it. */
  title: string
  /** Durable session id, so the file traces back to its source. */
  sessionId: string
  /** Export stamp already formatted for the reader's device. */
  exportedAt: string
  /** True when the page budget ended the read before the log's first event. */
  truncated?: boolean
}

/**
 * Render conversation rows as one Markdown document.
 *
 * @param rows - Conversation rows in durable order.
 * @param header - Session identity and export stamp.
 * @returns Markdown with one section per row, or a header-only document when the session holds no rows.
 */
export function renderSessionLog(rows: readonly NativeConversationRow[], header: SessionLogHeader): string {
  const front = [
    '# ' + headingText(header.title),
    '',
    '- ' + t('log.headerSessionId') + '：' + header.sessionId,
    '- ' + t('log.headerExportedAt') + '：' + header.exportedAt,
    ...(header.truncated === true ? ['', '> ' + t('log.headerTruncated')] : []),
  ].join('\n')
  return [front, ...rows.flatMap(rowSections)].join('\n\n') + '\n'
}

/**
 * Name the file the share sheet receives, keeping the id as the stable part.
 *
 * @param sessionId - Durable session id.
 * @returns A Markdown file name with no path separator or whitespace.
 */
export function sessionLogFileName(sessionId: string): string {
  const stem = sessionId.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '')
  return 'dsh-session-' + (stem === '' ? 'log' : stem) + '.md'
}

function rowSections(row: NativeConversationRow): string[] {
  switch (row.kind) {
    case 'user':
      return [block(t('log.roleUser'), paragraphs(row.text))]
    case 'assistant':
      return [block(t('log.roleAssistant'), paragraphs(row.text))]
    case 'reasoning':
      return [details(t('log.roleReasoning'), row.text)]
    case 'tool':
      return [
        block(format('log.sectionTool', { name: row.toolName }), [
          stateLine(row.state),
          ...labelled(t('log.fieldInput'), row.toolInput),
          ...labelled(t('log.fieldOutput'), row.output),
        ]),
      ]
    case 'command':
      return [
        block(format('log.sectionCommand', { name: row.name }), [
          commandStateLine(row.state),
          ...(row.text === undefined || row.text.trim() === '' ? [] : ['', codeBlock(row.text)]),
        ]),
      ]
    case 'retry':
      return [
        block(t('log.sectionRetry'), [
          format('log.retryDetail', {
            delayMs: row.delayMs,
            maxRetries: row.maxRetries,
            message: row.failureMessage,
            retry: row.retry,
          }),
        ]),
      ]
    case 'turn-error':
      return [block(t('log.sectionTurnError'), [codeBlock(row.message)])]
    case 'turn-max-tokens':
      return [block(t('log.sectionTurnMaxTokens'), [t('log.turnMaxTokensBody')])]
    case 'compaction':
      return [
        block(t('log.sectionCompaction'), [
          ...compactionDetail(row),
          ...(row.summary.trim() === '' ? [] : ['', row.summary]),
        ]),
      ]
  }
}

function compactionDetail(row: Extract<NativeConversationRow, { kind: 'compaction' }>): string[] {
  if (row.shadowedItemCount === undefined || row.shadowedTokenCount === undefined) return []
  return [format('log.compactionDetail', { items: row.shadowedItemCount, tokens: row.shadowedTokenCount })]
}

function stateLine(state: 'completed' | 'failed' | 'running'): string {
  const labels = {
    completed: t('log.stateCompleted'),
    failed: t('log.stateFailed'),
    running: t('log.stateRunning'),
  } as const
  return '- ' + t('log.fieldState') + '：' + labels[state]
}

function commandStateLine(state: 'error' | 'running' | 'success'): string {
  const labels = {
    error: t('log.stateError'),
    running: t('log.stateRunning'),
    success: t('log.stateSuccess'),
  } as const
  return '- ' + t('log.fieldState') + '：' + labels[state]
}

function labelled(label: string, body: string | undefined): string[] {
  if (body === undefined || body.trim() === '') return []
  return ['', '**' + label + '**', '', codeBlock(body)]
}

function paragraphs(text: string): string[] {
  const trimmed = text.trim()
  return trimmed === '' ? [] : [trimmed]
}

function details(summary: string, body: string): string {
  const trimmed = body.trim()
  if (trimmed === '') return block(summary, [])
  return '<details>' + '\n' + '<summary>' + summary + '</summary>' + '\n' + '\n' + trimmed + '\n' + '\n' + '</details>'
}

function block(heading: string, lines: readonly string[]): string {
  return lines.length === 0 ? '### ' + heading : '### ' + heading + '\n' + '\n' + lines.join('\n')
}

function headingText(title: string): string {
  const collapsed = title.replace(/\s+/g, ' ').trim()
  return collapsed === '' ? t('log.roleAssistant') : collapsed
}

function codeBlock(body: string): string {
  const longest = (body.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0)
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return fence + '\n' + body.replace(/\s+$/, '') + '\n' + fence
}
