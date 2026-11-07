import { NativeIcon } from '@/components/native-icon'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobileJobView, MobileSubagentEntry } from '@/types/mobile'
import { Pressable, StyleSheet, Text, View } from 'react-native'

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
  const children = subagents.filter((entry): entry is MobileChildSubagentEntry => entry.kind === 'child')
  const diagnostics = subagents.filter(
    (entry): entry is Extract<MobileSubagentEntry, { kind: 'diagnostic' }> => entry.kind === 'diagnostic',
  )
  if (jobs.length === 0 && children.length === 0 && diagnostics.length === 0) return null
  return (
    <View style={styles.activity}>
      {jobs.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{message('activity.backgroundJobs')}</Text>
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
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
                <NativeIcon name="agent-preset-outline" size={16} color={theme.colors.accentText} />
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
          {diagnostics.map((entry) => (
            <Text key={entry.id} style={styles.diagnostic}>
              {format('activity.subagentDiagnostic', { name: entry.id, reason: diagnosticReason(entry.reason) })}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function JobRow({ job }: { job: MobileJobView }): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const live = job.status === 'running' || job.status === 'stopping'
  return (
    <View style={styles.jobRow}>
      <View style={[styles.dot, live ? styles.dotLive : styles.dotIdle]} />
      <View style={styles.jobCopy}>
        <Text numberOfLines={1} style={styles.jobLabel}>
          {job.label || job.kind}
        </Text>
        <Text numberOfLines={1} style={styles.jobMeta}>
          {job.detail ?? job.status}
        </Text>
      </View>
    </View>
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
    diagnostic: { color: theme.colors.warning, fontSize: 13, lineHeight: 20 },
    pressed: { opacity: 0.62 },
  })
