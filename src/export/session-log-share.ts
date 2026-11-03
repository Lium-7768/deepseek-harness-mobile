/**
 * Hands a session log to the platform share sheet as a Markdown file.
 *
 * The log is read from the Gateway (which owns durable history), rendered by the
 * pure renderer in `session-log.ts`, written to the cache directory, and offered
 * to whatever share target the device has. Nothing leaves the device until the
 * reader picks a target.
 */
import { MobileApi } from '@/api/mobile-api'
import { projectNativeConversationRows } from '@/components/session-conversation-logic'
import { t } from '@/locale'
import type { SharedEventItem } from '@/shared/dsh-presentation'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { collectSessionHistory } from './session-history'
import { renderSessionLog, sessionLogFileName } from './session-log'

/** What the share attempt did, so the caller can raise the right alert. */
export type SessionLogShareOutcome = 'empty' | 'shared' | 'unsupported'

/**
 * Export one session log through the share sheet.
 *
 * @param client - Gateway client for the paired device.
 * @param session - Session to export; the title becomes the document heading.
 * @param now - Clock reading for the export stamp.
 * @returns Whether the sheet opened, the session held nothing, or the device cannot share.
 */
export async function shareSessionLog(
  client: MobileApi,
  session: { sessionId: string; title: string },
  now: Date = new Date(),
): Promise<SessionLogShareOutcome> {
  if (!(await Sharing.isAvailableAsync())) return 'unsupported'
  const history = await collectSessionHistory((beforeSeq) =>
    client.sessionHistory(session.sessionId, beforeSeq === undefined ? {} : { beforeSeq }),
  )
  const rows = projectNativeConversationRows(history.items as SharedEventItem[])
  if (rows.length === 0) return 'empty'
  const markdown = renderSessionLog(rows, {
    exportedAt: exportStamp(now),
    sessionId: session.sessionId,
    title: session.title,
    truncated: history.truncated,
  })
  const uri = FileSystem.cacheDirectory + sessionLogFileName(session.sessionId)
  await FileSystem.writeAsStringAsync(uri, markdown, { encoding: FileSystem.EncodingType.UTF8 })
  await Sharing.shareAsync(uri, { dialogTitle: t('log.dialogTitle'), mimeType: 'text/markdown' })
  return 'shared'
}

function exportStamp(now: Date): string {
  return now.toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
