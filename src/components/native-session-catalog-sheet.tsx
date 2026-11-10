import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeIcon } from '@/components/native-icon'
import type { MobileJobView, MobileSubagentEntry } from '@/types/mobile'
import { useAppTheme } from '@/theme/hooks'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

/**
 * The desktop's header catalog on a phone: one sheet listing what belongs to this
 * session, in the desktop's order and with its own glyphs.
 *
 * The desktop splits this into two header popovers (the subagent catalog and the job
 * list). A phone keeps one sheet with two sections, because the same tap has to reach
 * both and a second sheet would only add a step. Each section names its own progress
 * the way the desktop's catalog header does (`2 已完成 · 1 运行中`), and a child row
 * carries its label, its identity line and, when known, its token total.
 *
 * @param props.jobs - Background jobs the Host reported.
 * @param props.onClose - Closes the sheet.
 * @param props.onOpenSubagent - Opens one direct child.
 * @param props.open - Whether the sheet is showing.
 * @param props.subagents - Direct child sessions plus any diagnostics.
 * @returns The sheet, or `null` while closed.
 */
export function NativeSessionCatalogSheet({
  jobs,
  onClose,
  onOpenSubagent,
  open,
  subagents,
}: {
  jobs: readonly MobileJobView[]
  onClose: () => void
  onOpenSubagent: (entry: Extract<MobileSubagentEntry, { kind: 'child' }>) => void
  open: boolean
  subagents: readonly MobileSubagentEntry[]
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  type ChildEntry = Extract<MobileSubagentEntry, { kind: 'child' }>
  const children = subagents.filter((entry): entry is ChildEntry => entry.kind === 'child')
  const diagnostics = subagents.filter((entry) => entry.kind === 'diagnostic')
  const running = children.filter((entry) => entry.activity === 'running').length
  const idle = children.length - running
  return (
    <NativeAnchoredPanel onClose={onClose} open={open}>
      <View style={s.content}>
        <ScrollView contentContainerStyle={s.list} style={s.scroll}>
          {children.length === 0 && diagnostics.length === 0 ? null : (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <NativeIcon name="users-outline" size={16} color={theme.colors.inkMuted} />
                <Text style={s.sectionTitle}>{message('activity.subagents')}</Text>
                <Text style={s.sectionMeta}>
                  {[running > 0 ? format('conversation.catalogRunning', { count: running }) : undefined]
                    .concat(idle > 0 ? [format('conversation.catalogDone', { count: idle })] : [])
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {children.map((entry) => (
                <Pressable
                  accessibilityLabel={format('activity.openSubagent', { name: entry.label ?? entry.id })}
                  accessibilityRole="button"
                  key={entry.id}
                  onPress={() => {
                    onClose()
                    onOpenSubagent(entry)
                  }}
                  style={({ pressed }) => [s.row, pressed && s.pressed]}
                >
                  <View style={[s.dot, entry.activity === 'running' ? s.dotLive : null]} />
                  <View style={s.rowText}>
                    <Text numberOfLines={1} style={s.label}>
                      {entry.label ?? entry.id}
                    </Text>
                    <Text numberOfLines={1} style={s.meta}>
                      {[
                        // A child's identity is a session id; printing a UUID says less
                        // than the mode line beside it, so it only appears when it is a
                        // readable slug rather than a generated id.
                        entry.label === undefined || UUID.test(entry.id) ? undefined : entry.id,
                        entry.mode === 'continuable'
                          ? message('activity.subagentContinuable')
                          : message('activity.subagentOneShot'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <NativeIcon name="chevron-right-outline" size={16} color={theme.colors.inkFaint} />
                </Pressable>
              ))}
              {diagnostics.map((entry) => (
                <View key={entry.id} style={s.row}>
                  <NativeIcon name="warning-outline" size={14} color={theme.colors.warningText} />
                  <Text numberOfLines={2} style={[s.meta, s.diagnostic]}>
                    {format('activity.subagentDiagnostic', { name: entry.id, reason: entry.reason })}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {jobs.length === 0 ? null : (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <NativeIcon name="queue-outline" size={16} color={theme.colors.inkMuted} />
                <Text style={s.sectionTitle}>{message('conversation.jobsTitle')}</Text>
                <Text style={s.sectionMeta}>{format('conversation.catalogJobs', { count: jobs.length })}</Text>
              </View>
              {jobs.map((job) => (
                <View key={job.id} style={s.row}>
                  <View style={[s.dot, isRunning(job.status) ? s.dotLive : null]} />
                  <View style={s.rowText}>
                    <Text numberOfLines={1} style={s.label}>
                      {job.label}
                    </Text>
                  </View>
                  <Text style={[s.status, isRunning(job.status) && s.statusLive]}>
                    {message(
                      job.status === 'running' || job.status === 'queued'
                        ? 'activity.jobRunning'
                        : 'activity.jobFinished',
                    )}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </NativeAnchoredPanel>
  )
}

/** A generated session id, which names nothing a reader can use. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Whether one job is still doing work. */
function isRunning(status: string): boolean {
  return status === 'running' || status === 'queued'
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: { padding: 12 },
    // Bounded so a busy session scrolls inside the sheet rather than past the screen.
    scroll: { maxHeight: 420 },
    list: { gap: 14 },
    section: { gap: 2 },
    sectionHead: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingBottom: 4 },
    sectionTitle: { color: theme.colors.ink, flexShrink: 0, fontSize: 13, fontWeight: '600', lineHeight: 20 },
    sectionMeta: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 12, lineHeight: 20, marginLeft: 'auto' },
    row: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 40, paddingVertical: 6 },
    dot: { backgroundColor: theme.colors.inkFaint, borderRadius: 3, height: 6, width: 6 },
    dotLive: { backgroundColor: theme.colors.success },
    rowText: { flex: 1, gap: 1, minWidth: 0 },
    label: { color: theme.colors.ink, fontSize: 14, lineHeight: 20 },
    meta: { color: theme.colors.inkTertiary, fontSize: 11, lineHeight: 16 },
    diagnostic: { flex: 1 },
    status: { color: theme.colors.inkMuted, flexShrink: 0, fontSize: 12, lineHeight: 20 },
    statusLive: { color: theme.colors.success },
    pressed: { opacity: 0.55 },
  })
