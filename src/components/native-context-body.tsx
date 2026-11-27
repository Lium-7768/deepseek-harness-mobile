/**
 * Structured expanded bodies for logged context disclosures, mirroring desktop
 * `packages/client/ui-chat/src/client/chat/ContextBody.tsx` and `ContextBody.module.css`.
 *
 * Supports all 6 durable context forms (`instructions`, `catalog`, `snapshot`,
 * `notice`, `relay`, `recall`) with automatic fallback to `OpaqueBody` when a form
 * is absent, unknown, or malformed. All text renders in 11/16 monospace inside the
 * shared 141pt code-block scrollport.
 */

import type { KnownContextForm } from '@/components/session-conversation-logic'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/** Model-facing text stays bounded at the disclosure, matching desktop `MAX_CHARS`. */
const MAX_CHARS = 20_000
/** Catalog rows materialized before summarizing the remainder, matching desktop `MAX_ENTRIES`. */
const MAX_ENTRIES = 200

export type ContextContentBlock = Readonly<Record<string, unknown>>

type ContentRun = { readonly text: string } | { readonly block: unknown }

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function contentBlocksOf(
  contentBlocks: readonly ContextContentBlock[] | undefined,
  fallbackText: string,
): readonly ContextContentBlock[] {
  if (contentBlocks !== undefined && contentBlocks.length > 0) return contentBlocks
  return fallbackText === '' ? [] : [{ type: 'text', text: fallbackText }]
}

function contentRuns(content: readonly ContextContentBlock[]): ContentRun[] {
  const runs: ContentRun[] = []
  for (const block of content) {
    if (block.type !== 'text' || typeof block.text !== 'string') {
      runs.push({ block })
      continue
    }
    const last = runs[runs.length - 1]
    if (last !== undefined && 'text' in last) runs[runs.length - 1] = { text: `${last.text}${block.text}` }
    else runs.push({ text: block.text })
  }
  return runs
}

function unknownBlocks(content: readonly ContextContentBlock[]): unknown[] {
  return contentRuns(content).flatMap((run) => ('block' in run ? [run.block] : []))
}

function boundedText(text: string): string {
  return text.length > MAX_CHARS
    ? `${text.slice(0, MAX_CHARS)}\n${format('conversation.jsonTruncated', { total: text.length })}`
    : text
}

function formatFieldValue(value: unknown): string {
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value)
  return boundedText(text ?? 'null')
}

function formatUnknownBlock(block: unknown): string {
  try {
    return boundedText(JSON.stringify(block, null, 2))
  } catch {
    return boundedText(String(block))
  }
}

interface InstructionChange {
  readonly action: 'set' | 'replace' | 'remove'
  readonly path: string
}

function instructionChanges(source: unknown): InstructionChange[] | null {
  const record = asRecord(source)
  const list = record === null ? undefined : record.changes
  if (!Array.isArray(list)) return null
  const seen = new Set<string>()
  const changes: InstructionChange[] = []
  for (const item of list as readonly unknown[]) {
    const change = asRecord(item)
    if (change === null) return null
    const path = change.path
    const action = change.action
    if (typeof path !== 'string' || path === '') return null
    if (action !== 'set' && action !== 'replace' && action !== 'remove') return null
    if (seen.has(path)) continue
    seen.add(path)
    changes.push({ action, path })
  }
  return changes.length === 0 ? null : changes
}

function instructionActionLabel(action: InstructionChange['action'], baseline: boolean): string {
  if (action === 'remove') return message('conversation.contextInstructionsRemoved')
  if (baseline) return message('conversation.contextInstructionsLoaded')
  return action === 'set'
    ? message('conversation.contextInstructionsAdded')
    : message('conversation.contextInstructionsUpdated')
}

interface CatalogEntry {
  readonly name: string
  readonly description: string
}

function catalogEntries(source: unknown): CatalogEntry[] | null {
  const record = asRecord(source)
  const list = record === null ? undefined : record.entries
  if (!Array.isArray(list)) return null
  const entries: CatalogEntry[] = []
  for (const item of list as readonly unknown[]) {
    const entry = asRecord(item)
    if (entry === null) return null
    const name = entry.name
    const description = entry.description
    if (typeof name !== 'string' || name === '' || typeof description !== 'string') return null
    entries.push({ name, description })
  }
  return entries
}

interface SnapshotSection {
  readonly name: string
  readonly text: string
}

function snapshotSections(source: unknown): SnapshotSection[] | null {
  const record = asRecord(source)
  const list = record === null ? undefined : record.sections
  if (!Array.isArray(list)) return null
  const sections: SnapshotSection[] = []
  for (const item of list as readonly unknown[]) {
    const section = asRecord(item)
    if (section === null) return null
    const name = section.name
    const text = section.text
    if (typeof name !== 'string' || name === '' || typeof text !== 'string') return null
    sections.push({ name, text })
  }
  return sections.length === 0 ? null : sections
}

function noticeSummaryOf(source: unknown): string | null {
  const summary = asRecord(source)?.summary
  return typeof summary === 'string' && summary !== '' ? summary : null
}

function relaySenderOf(source: unknown): string | null {
  const sender = asRecord(source)?.senderSessionId
  return typeof sender === 'string' && sender !== '' ? sender : null
}

interface RecalledSession {
  readonly label: string
  readonly retained: number
  readonly omitted: number
  readonly truncated: boolean
}

function recalledSessions(source: unknown): RecalledSession[] | null {
  const record = asRecord(source)
  const list = record === null ? undefined : record.references
  if (!Array.isArray(list)) return null
  const sessions: RecalledSession[] = []
  for (const item of list as readonly unknown[]) {
    const reference = asRecord(item)
    if (reference === null) return null
    const label = reference.label
    const retained = reference.retainedMessages
    const omitted = reference.omittedMessages
    const truncated = reference.truncated
    if (
      typeof label !== 'string' ||
      label === '' ||
      typeof retained !== 'number' ||
      typeof omitted !== 'number' ||
      typeof truncated !== 'boolean'
    )
      return null
    sessions.push({ label, retained, omitted, truncated })
  }
  return sessions.length === 0 ? null : sessions
}

export interface ResolvedContextPresentation {
  readonly rendered: KnownContextForm | null
  readonly summary: string | null
  readonly hasBody: boolean
}

/**
 * Resolves which form can actually render from durable fields (falling back to opaque
 * when declared fields are missing or malformed) and extracts the collapsed notice summary.
 */
export function resolveContextPresentation({
  contentBlocks,
  form,
  source,
  text,
}: {
  form?: KnownContextForm
  source?: Readonly<Record<string, unknown>> | null
  contentBlocks?: readonly ContextContentBlock[]
  text: string
}): ResolvedContextPresentation {
  const blocks = contentBlocksOf(contentBlocks, text)
  const record = asRecord(source)
  const hasOpaqueFields = record !== null && Object.keys(record).some((key) => key !== 'kind')
  const hasContent = blocks.some(
    (block) => block.type !== 'text' || (typeof block.text === 'string' && block.text !== ''),
  )
  switch (form) {
    case 'instructions': {
      if (instructionChanges(source) !== null) return { rendered: 'instructions', summary: null, hasBody: true }
      break
    }
    case 'catalog': {
      if (catalogEntries(source) !== null) return { rendered: 'catalog', summary: null, hasBody: true }
      break
    }
    case 'snapshot': {
      if (snapshotSections(source) !== null) return { rendered: 'snapshot', summary: null, hasBody: true }
      break
    }
    case 'notice': {
      const summary = noticeSummaryOf(source)
      if (summary !== null) return { rendered: 'notice', summary, hasBody: hasContent }
      break
    }
    case 'relay': {
      if (relaySenderOf(source) !== null) return { rendered: 'relay', summary: null, hasBody: true }
      break
    }
    case 'recall': {
      if (recalledSessions(source) !== null) return { rendered: 'recall', summary: null, hasBody: true }
      break
    }
    case undefined:
      break
  }
  return { rendered: null, summary: null, hasBody: hasContent || hasOpaqueFields }
}

function ModelFacingContent({ content }: { content: readonly ContextContentBlock[] }): ReactNode {
  const s = useThemedStyles(makeStyles)
  return (
    <>
      {contentRuns(content).map((run, index) =>
        'text' in run ? (
          run.text === '' ? null : (
            <Text key={index} selectable style={s.text}>
              {boundedText(run.text)}
            </Text>
          )
        ) : (
          <View key={index} style={s.unknownBlock}>
            <Text style={s.unknownLabel}>{message('conversation.unknownBlock')}</Text>
            <Text selectable style={s.unknownPayload}>
              {formatUnknownBlock(run.block)}
            </Text>
          </View>
        ),
      )}
    </>
  )
}

function UnknownBlocks({ blocks }: { blocks: readonly unknown[] }): ReactNode {
  const s = useThemedStyles(makeStyles)
  if (blocks.length === 0) return null
  return (
    <>
      {blocks.map((block, index) => (
        <View key={index} style={s.unknownBlock}>
          <Text style={s.unknownLabel}>{message('conversation.unknownBlock')}</Text>
          <Text selectable style={s.unknownPayload}>
            {formatUnknownBlock(block)}
          </Text>
        </View>
      ))}
    </>
  )
}

function SourceFields({ source }: { source: unknown }): ReactNode {
  const s = useThemedStyles(makeStyles)
  const record = asRecord(source)
  if (record === null) return null
  const rows = Object.entries(record).filter(([key]) => key !== 'kind')
  if (rows.length === 0) return null
  return (
    <View style={s.fields}>
      {rows.map(([key, value]) => (
        <View key={key} style={s.field}>
          <Text style={s.fieldKey}>{key}</Text>
          <Text selectable style={s.fieldValue}>
            {formatFieldValue(value)}
          </Text>
        </View>
      ))}
    </View>
  )
}

/** Renders the desktop-aligned structured or opaque context body inside the 141pt code scrollport. */
export function NativeContextBody({
  contentBlocks,
  form,
  source,
  text,
}: {
  form?: KnownContextForm
  source?: Readonly<Record<string, unknown>> | null
  contentBlocks?: readonly ContextContentBlock[]
  text: string
}): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const blocks = contentBlocksOf(contentBlocks, text)
  const resolved = resolveContextPresentation({ contentBlocks: blocks, form, source, text })
  if (resolved.rendered === 'instructions') {
    const changes = instructionChanges(source) ?? []
    const baseline = asRecord(source)?.baseline === true
    return (
      <View style={s.root}>
        <View style={s.files}>
          {changes.map((change) => (
            <View key={change.path} style={s.file}>
              <Text selectable style={s.filePath}>
                {change.path}
              </Text>
              <Text style={s.fileAction}>{instructionActionLabel(change.action, baseline)}</Text>
            </View>
          ))}
        </View>
        <ModelFacingContent content={blocks} />
      </View>
    )
  }
  if (resolved.rendered === 'catalog') {
    const entries = catalogEntries(source) ?? []
    const update = asRecord(source)?.update === true
    const shown = entries.slice(0, MAX_ENTRIES)
    const rest = unknownBlocks(blocks)
    return (
      <View style={s.root}>
        {update ? <Text style={s.catalogNotice}>{message('conversation.contextCatalogReplaced')}</Text> : null}
        <View style={s.entries}>
          {shown.map((entry, index) => (
            <View key={index} style={s.entry}>
              <Text selectable style={s.entryName}>
                {entry.name}
              </Text>
              <Text numberOfLines={1} selectable style={s.entryDescription}>
                {entry.description}
              </Text>
            </View>
          ))}
        </View>
        {shown.length < entries.length ? (
          <Text style={s.catalogNotice}>
            {format('conversation.contextCatalogMore', { count: entries.length - shown.length })}
          </Text>
        ) : null}
        <UnknownBlocks blocks={rest} />
      </View>
    )
  }
  if (resolved.rendered === 'snapshot') {
    const sections = snapshotSections(source) ?? []
    return (
      <View style={s.root}>
        <Text style={s.catalogNotice}>{message('conversation.contextSnapshotSupersedes')}</Text>
        <View style={s.sections}>
          {sections.map((section, index) => (
            <View key={index} style={s.section}>
              <Text style={s.sectionName}>{section.name}</Text>
              <Text selectable style={s.sectionText}>
                {boundedText(section.text)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    )
  }
  if (resolved.rendered === 'notice') {
    return (
      <View style={s.root}>
        <ModelFacingContent content={blocks} />
      </View>
    )
  }
  if (resolved.rendered === 'relay') {
    const sender = relaySenderOf(source) ?? ''
    return (
      <View style={s.root}>
        <Text selectable style={s.relaySender}>
          {format('conversation.contextRelayFrom', { session: sender })}
        </Text>
        <ModelFacingContent content={blocks} />
      </View>
    )
  }
  if (resolved.rendered === 'recall') {
    const sessions = recalledSessions(source) ?? []
    return (
      <View style={s.root}>
        <View style={s.recalls}>
          {sessions.map((session, index) => (
            <View key={index} style={s.recall}>
              <Text selectable style={s.recallLabel}>
                {session.label}
              </Text>
              <Text style={s.recallCounts}>
                {format('conversation.contextRecallCounts', {
                  retained: session.retained,
                  omitted: session.omitted,
                })}
              </Text>
              {session.truncated ? (
                <Text style={s.recallCounts}>{message('conversation.contextRecallTruncated')}</Text>
              ) : null}
            </View>
          ))}
        </View>
        <ModelFacingContent content={blocks} />
      </View>
    )
  }
  return (
    <View style={s.root}>
      <ModelFacingContent content={blocks} />
      <SourceFields source={source} />
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { minWidth: 0 },
    // Desktop `ContextInjectionRow.module.css .body` + `ContextBody.module.css`: 11/16 monospace.
    text: { color: theme.colors.inkMuted, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    fields: {
      borderTopColor: theme.colors.borderL2,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 2,
      marginTop: 8,
      paddingTop: 8,
    },
    field: { flexDirection: 'row', gap: 8, minWidth: 0 },
    fieldKey: { color: theme.colors.inkFaint, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16, minWidth: 96 },
    fieldValue: {
      color: theme.colors.inkTertiary,
      flex: 1,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      lineHeight: 16,
      minWidth: 0,
    },
    files: { columnGap: 12, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, rowGap: 4 },
    file: { alignItems: 'baseline', flexDirection: 'row', gap: 6, minWidth: 0 },
    filePath: { color: theme.colors.inkMuted, flexShrink: 1, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    fileAction: { color: theme.colors.inkFaint, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    catalogNotice: {
      color: theme.colors.inkFaint,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      lineHeight: 16,
      marginBottom: 6,
    },
    entries: { gap: 4 },
    entry: { flexDirection: 'row', gap: 8, minWidth: 0 },
    entryName: { color: theme.colors.inkMuted, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    entryDescription: {
      color: theme.colors.inkTertiary,
      flex: 1,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      lineHeight: 16,
      minWidth: 0,
    },
    sections: { gap: 8 },
    section: { gap: 2, minWidth: 0 },
    sectionName: { color: theme.colors.inkFaint, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    sectionText: { color: theme.colors.inkMuted, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    relaySender: {
      color: theme.colors.inkFaint,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      lineHeight: 16,
      marginBottom: 6,
    },
    recalls: { gap: 2, marginBottom: 8 },
    recall: { columnGap: 8, flexDirection: 'row', flexWrap: 'wrap', minWidth: 0 },
    recallLabel: {
      color: theme.colors.inkMuted,
      flexShrink: 1,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      lineHeight: 16,
    },
    recallCounts: { color: theme.colors.inkFaint, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    unknownBlock: { gap: 2, marginTop: 6 },
    unknownLabel: { color: theme.colors.inkFaint, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    unknownPayload: { color: theme.colors.inkTertiary, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
  })
