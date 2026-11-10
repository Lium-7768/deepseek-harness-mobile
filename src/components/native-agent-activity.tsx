import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeIcon } from '@/components/native-icon'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileJobView, MobileSubagentEntry } from '@/types/mobile'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

/** Background job rows shown before the overflow collapses. */
const VISIBLE_JOBS = 3

type MobileChildSubagentEntry = Extract<MobileSubagentEntry, { kind: 'child' }>
type MobileDiagnosticReason = Extract<MobileSubagentEntry, { kind: 'diagnostic' }>['reason']

/** Maps the Host's diagnostic token onto the localized reason the row prints. */
function diagnosticReason(reason: MobileDiagnosticReason): string {
  if (reason === 'corrupt') return message('activity.subagentReasonCorrupt')
  if (reason === 'unsupported') return message('activity.subagentReasonUnsupported')
  return message('activity.subagentReasonUnavailable')
}
type MobileContinuableSubagentEntry = MobileChildSubagentEntry & { mode: 'continuable' }

/** Displays the same host-owned job summary and direct-child catalog used by the desktop Web header. */
export function NativeAgentActivity({
  jobs,
  subagents,
  interruptingId,
  onOpenSubagent,
  onInterruptSubagent,
}: {
  jobs: MobileJobView[]
  subagents: MobileSubagentEntry[]
  interruptingId?: string
  onOpenSubagent: (entry: MobileChildSubagentEntry) => void
  onInterruptSubagent: (entry: MobileContinuableSubagentEntry) => void
}): React.JSX.Element | null {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const [jobsExpanded, setJobsExpanded] = useState(false)
  const children = subagents.filter((entry): entry is MobileChildSubagentEntry => entry.kind === 'child')
  const diagnostics = subagents.filter(
    (entry): entry is Extract<MobileSubagentEntry, { kind: 'diagnostic' }> => entry.kind === 'diagnostic',
  )
  if (jobs.length === 0 && children.length === 0 && diagnostics.length === 0) return null
  // A session with a dozen background jobs would otherwise put a dozen rows
  // between the header and the transcript; the overflow collapses to one line.
  const collapsedJobs = jobs.slice(0, VISIBLE_JOBS)
  const hiddenJobs = jobs.length - collapsedJobs.length
  return (
    <View style={styles.activity}>
      {jobs.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{message('activity.backgroundJobs')}</Text>
          {(jobsExpanded ? jobs : collapsedJobs).map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
          {hiddenJobs > 0 ? (
            <Pressable
              accessibilityLabel={format('activity.moreJobs', { count: hiddenJobs })}
              accessibilityRole="button"
              accessibilityState={{ expanded: jobsExpanded }}
              onPress={() => setJobsExpanded((current) => !current)}
              style={({ pressed }) => [styles.moreJobs, pressed && styles.pressed]}
            >
              <Text style={styles.moreJobsText}>
                {jobsExpanded ? message('activity.collapseJobs') : format('activity.moreJobs', { count: hiddenJobs })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children.length > 0 || diagnostics.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{message('activity.subagents')}</Text>
          {children.map((entry) => (
            <View key={entry.id} style={styles.subagentRow}>
              <Pressable
                android_ripple={{ borderless: false }}
                accessibilityRole="button"
                accessibilityLabel={format('activity.openSubagent', { name: entry.label ?? entry.id })}
                onPress={() => onOpenSubagent(entry)}
                style={({ pressed }) => [styles.subagentMain, pressed && styles.pressed]}
              >
                <NativeIcon name="users-outline" size={16} color={theme.colors.accentText} />
                <View style={styles.subagentCopy}>
                  <Text numberOfLines={1} style={styles.subagentLabel}>
                    {entry.label ?? entry.id}
                  </Text>
                  <Text style={styles.subagentMeta}>
                    {entry.activity === 'running'
                      ? message('activity.subagentRunning')
                      : message('activity.subagentIdle')}{' '}
                    ·{' '}
                    {entry.mode === 'continuable'
                      ? message('activity.subagentContinuable')
                      : message('activity.subagentOneShot')}
                  </Text>
                </View>
                <NativeIcon name="chevron-right-outline" size={16} color={theme.colors.inkMuted} />
              </Pressable>
              {entry.mode === 'continuable' && entry.activity === 'running' ? (
                <Pressable
                  android_ripple={{ borderless: false }}
                  accessibilityRole="button"
                  accessibilityLabel={format('activity.stopSubagent', { name: entry.label ?? entry.id })}
                  accessibilityState={{ busy: interruptingId === entry.id }}
                  disabled={interruptingId !== undefined}
                  onPress={() => onInterruptSubagent({ ...entry, mode: 'continuable' })}
                  style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}
                >
                  <NativeIcon name="stop-fill" size={14} color={theme.colors.danger} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {/* A diagnostic is a row like the ones above it, not a stray paragraph:
              same leading glyph slot so the section reads as one list. */}
          {diagnostics.map((entry) => (
            <View key={entry.id} style={styles.diagnosticRow}>
              <View style={styles.diagnosticIcon}>
                <NativeIcon name="warning-outline" size={16} color={theme.colors.warningText} />
              </View>
              <Text style={styles.diagnostic}>
                {format('activity.subagentDiagnostic', { name: entry.id, reason: diagnosticReason(entry.reason) })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/**
 * Names one job state in the reader's language.
 *
 * @param status - The Host's wire token.
 * @returns The localized label, falling back to the token for a state this client
 * does not know.
 */
/**
 * Names one job's status the way the desktop's job list does.
 *
 * @param status - The wire status token.
 * @returns The localized status.
 */
export function jobStatusLabel(status: string): string {
  switch (status) {
    case 'running':
      return message('activity.jobRunning')
    case 'stopping':
      return message('activity.jobStopping')
    case 'completed':
    case 'done':
      return message('activity.jobCompleted')
    case 'failed':
      return message('activity.jobFailed')
    case 'pending':
    case 'queued':
      return message('activity.jobPending')
    default:
      return status
  }
}

function JobRow({ job }: { job: MobileJobView }): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const theme = useAppTheme()
  const [open, setOpen] = useState(false)
  const live = job.status === 'running' || job.status === 'stopping'
  const title = job.label || job.kind
  const status = jobStatusLabel(job.status)
  // The card above the transcript can only spare a line each, so the row opens the
  // job's own record: a phone has no second place to read a background task.
  return (
    <>
      <Pressable
        android_ripple={{ borderless: false }}
        accessibilityLabel={`${title} ${status}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.jobRow, pressed && styles.pressed]}
      >
        <View style={[styles.dot, live ? styles.dotLive : styles.dotIdle]} />
        <View style={styles.jobCopy}>
          <Text numberOfLines={1} style={styles.jobLabel}>
            {title}
          </Text>
          <Text numberOfLines={2} style={styles.jobMeta}>
            {job.detail ?? status}
          </Text>
        </View>
        <NativeIcon name="chevron-right-outline" size={14} color={theme.colors.inkMuted} />
      </Pressable>
      <NativeAnchoredPanel onClose={() => setOpen(false)} open={open}>
        <View style={styles.jobDetail}>
          <Text style={styles.jobDetailTitle}>{title}</Text>
          <Text style={styles.jobDetailMeta}>{format('activity.jobStatus', { kind: job.kind, status })}</Text>
          {job.detail === undefined ? null : (
            <Text selectable style={styles.jobDetailBody}>
              {job.detail}
            </Text>
          )}
        </View>
      </NativeAnchoredPanel>
    </>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    activity: {
      backgroundColor: theme.colors.surfaceRaised,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    section: { gap: 7 },
    sectionTitle: { color: theme.colors.inkTertiary, fontSize: 12, fontWeight: '600', lineHeight: 18 },
    jobRow: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 30 },
    dot: { borderRadius: 4, height: 7, width: 7 },
    dotLive: { backgroundColor: theme.colors.success },
    dotIdle: { backgroundColor: theme.colors.inkFaint },
    jobCopy: { flex: 1, gap: 1 },
    jobLabel: { color: theme.colors.ink, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    jobMeta: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    subagentRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
    subagentMain: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8, minHeight: theme.touch.minTarget },
    subagentCopy: { flex: 1, gap: 1 },
    subagentLabel: { color: theme.colors.ink, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    subagentMeta: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    stopButton: {
      alignItems: 'center',
      height: theme.touch.iconButton,
      justifyContent: 'center',
      width: theme.touch.iconButton,
    },
    diagnosticRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, paddingVertical: 2 },
    diagnosticIcon: { alignItems: 'center', justifyContent: 'center', width: 16 },
    diagnostic: { color: theme.colors.warningText, flex: 1, fontSize: 13, lineHeight: 20 },
    moreJobs: { justifyContent: 'center', minHeight: 32 },
    moreJobsText: { color: theme.colors.accent, fontSize: 13, lineHeight: 20 },
    jobDetail: { gap: 6, padding: 16 },
    jobDetailTitle: { color: theme.colors.ink, fontSize: 15, fontWeight: '600', lineHeight: 22 },
    jobDetailMeta: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 18 },
    jobDetailBody: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    pressed: { opacity: 0.62 },
  })
