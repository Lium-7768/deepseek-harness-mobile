import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { jobStatusLabel } from '@/components/native-agent-activity'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import type { MobileJobView } from '@/types/mobile'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

/** How many jobs the sheet lists before it stops and names the rest. */
const VISIBLE_JOBS = 12

/**
 * Lists this session's background jobs.
 *
 * The desktop keeps them in a header popover; a phone sheet gets the same rows on a
 * bounded surface: a title that says what the list is, one line per job with its own
 * status on the right, and a scroll area, because a busy session can hold dozens.
 *
 * @param props.jobs - Jobs the Host reported, newest first.
 * @param props.onClose - Closes the sheet.
 * @param props.open - Whether the sheet is showing.
 * @returns The sheet, or `null` while closed.
 */
export function NativeJobsSheet({
  jobs,
  onClose,
  open,
}: {
  jobs: readonly MobileJobView[]
  onClose: () => void
  open: boolean
}): React.JSX.Element | null {
  const s = useThemedStyles(makeStyles)
  const shown = jobs.slice(0, VISIBLE_JOBS)
  const remaining = jobs.length - shown.length
  return (
    <NativeAnchoredPanel onClose={onClose} open={open}>
      <View style={s.content}>
        <View style={s.heading}>
          <Text style={s.title}>{message('conversation.jobsTitle')}</Text>
          <Text style={s.count}>{format('conversation.jobsCount', { count: jobs.length })}</Text>
        </View>
        {jobs.length === 0 ? (
          <Text style={s.empty}>{message('conversation.noJobs')}</Text>
        ) : (
          <ScrollView contentContainerStyle={s.list} style={s.scroll}>
            {shown.map((job) => (
              <View key={job.id} style={s.row}>
                <View style={s.rowText}>
                  <Text numberOfLines={1} style={s.label}>
                    {job.label}
                  </Text>
                  {job.kind === '' ? null : (
                    <Text numberOfLines={1} style={s.kind}>
                      {job.kind}
                    </Text>
                  )}
                </View>
                <Text style={[s.status, isRunning(job.status) && s.statusLive]}>{jobStatusLabel(job.status)}</Text>
              </View>
            ))}
            {remaining > 0 ? <Text style={s.more}>{format('conversation.jobsMore', { count: remaining })}</Text> : null}
          </ScrollView>
        )}
      </View>
    </NativeAnchoredPanel>
  )
}

/** Whether one job is still doing work, so its status reads in the accent colour. */
function isRunning(status: string): boolean {
  return status === 'running' || status === 'queued'
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: { gap: 8, padding: 16 },
    heading: { alignItems: 'baseline', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
    title: { color: theme.colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 },
    count: { color: theme.colors.inkMuted, fontSize: 12, fontVariant: ['tabular-nums'], lineHeight: 20 },
    // Bounded so a long roster scrolls inside the sheet instead of pushing it off screen.
    scroll: { maxHeight: 320 },
    list: { gap: 2 },
    row: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 7 },
    rowText: { flex: 1, gap: 1, minWidth: 0 },
    label: { color: theme.colors.ink, fontSize: 13, lineHeight: 20 },
    kind: { color: theme.colors.inkTertiary, fontSize: 11, lineHeight: 16 },
    status: { color: theme.colors.inkMuted, flexShrink: 0, fontSize: 12, lineHeight: 20 },
    statusLive: { color: theme.colors.accent },
    more: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 20, paddingTop: 6 },
    empty: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20, paddingVertical: 8 },
  })
