import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import type { NativeConversationRow } from '@/components/session-conversation-logic'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { SharedMessagePresentation } from '@/shared/dsh-presentation'
import { format, t as message } from '@/locale'

type Variant = 'search' | 'read' | 'bash' | 'write' | 'edit' | 'code' | 'web' | 'other'
type ToolRow = Extract<NativeConversationRow, { kind: 'tool' }>
type ToolCardModel = {
  output?: string
  state: 'completed' | 'failed' | 'running'
  summary?: string
  toolInput?: string
  toolName: string
}

function variantFor(name?: string): Variant {
  const value = (name ?? '').toLowerCase()
  if (/search|grep|find/.test(value)) return 'search'
  if (/read|file|cat/.test(value)) return 'read'
  if (/bash|shell|terminal|command/.test(value)) return 'bash'
  if (/write|create/.test(value)) return 'write'
  if (/edit|patch|replace/.test(value)) return 'edit'
  if (/code|python|javascript/.test(value)) return 'code'
  if (/web|browser|fetch/.test(value)) return 'web'
  return 'other'
}

const META: Record<Variant, [NativeIconName, string]> = {
  search: ['search', message('tool.verbSearch')],
  read: ['description', message('tool.verbRead')],
  bash: ['terminal', message('tool.verbCommand')],
  write: ['note-add', message('tool.verbWrite')],
  edit: ['edit', message('tool.verbEdit')],
  code: ['code', message('tool.verbCode')],
  web: ['language', message('tool.verbWeb')],
  other: ['sparkle', message('tool.verbGeneric')],
}

/**
 * Renders one desktop-derived tool lifecycle as a compact native conversation row.
 *
 * @param props.presentation - Legacy shared projection used by the subagent view.
 * @param props.row - Full primary-session projection with desktop tool metadata.
 * @returns An expandable compact tool row.
 */
export function NativeToolCard({ presentation, row }: { presentation?: SharedMessagePresentation; row?: ToolRow }): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const [expanded, setExpanded] = useState(false)
  const model = useMemo<ToolCardModel>(() => {
    if (row !== undefined) {
      return {
        state: row.state,
        toolName: row.toolName,
        ...(row.summary === undefined ? {} : { summary: row.summary }),
        ...(row.toolInput === undefined ? {} : { toolInput: row.toolInput }),
        ...(row.output === undefined ? {} : { output: row.output }),
      }
    }
    return {
      state: presentation?.toolState ?? 'running',
      toolName: presentation?.toolName ?? message('tool.title'),
      ...(presentation?.toolInput === undefined ? {} : { toolInput: presentation.toolInput }),
      ...(presentation?.toolOutput === undefined ? {} : { output: presentation.toolOutput }),
      ...(presentation?.text ? { summary: presentation.text } : {}),
    }
  }, [presentation, row])
  const [icon, fallbackTitle] = useMemo(() => META[variantFor(model.toolName)], [model.toolName])
  const title = model.toolName || fallbackTitle
  const stateLabel = model.state === 'completed' ? message('tool.stateCompleted') : model.state === 'failed' ? message('tool.stateFailed') : message('tool.stateRunning')
  const hasDetails = Boolean(model.toolInput || model.output)
  return (
    <View style={[styles.root, model.state === 'failed' && styles.failedRoot]}>
      <Pressable
        accessibilityRole={hasDetails ? 'button' : undefined}
        accessibilityLabel={format('tool.accessibilityLabel', { tool: title, state: stateLabel })}
        accessibilityState={{ busy: model.state === 'running', expanded: hasDetails ? expanded : undefined }}
        disabled={!hasDetails}
        onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => [styles.row, hasDetails && pressed && styles.pressed]}
      >
        <NativeIcon name={icon} size={15} color={model.state === 'failed' ? theme.colors.danger : theme.colors.inkMuted} />
        <Text numberOfLines={1} style={styles.label}>
          Tool call
        </Text>
        <Text style={styles.separator}>·</Text>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {model.summary ? (
          <>
            <Text style={styles.separator}>·</Text>
            <Text numberOfLines={1} style={styles.summary}>
              {model.summary}
            </Text>
          </>
        ) : null}
        <View style={styles.state}>
          <View
            style={[
              styles.dot,
              model.state === 'completed' ? styles.completedDot : model.state === 'failed' ? styles.failedDot : styles.runningDot,
            ]}
          />
          {hasDetails ? <NativeIcon name={expanded ? 'expand-less' : 'expand-more'} size={15} color={theme.colors.inkFaint} /> : null}
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.details}>
          {model.toolInput ? <ToolPayload label="IN" text={model.toolInput} /> : null}
          {model.toolInput && model.output ? <View style={styles.divider} /> : null}
          {model.output ? <ToolPayload label="OUT" text={model.output} failed={model.state === 'failed'} /> : null}
        </View>
      ) : null}
    </View>
  )
}

function ToolPayload({ label, text, failed = false }: { label: 'IN' | 'OUT'; text: string; failed?: boolean }): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.payload}>
      <Text style={styles.payloadLabel}>{label}</Text>
      <ScrollView nestedScrollEnabled style={styles.payloadScroll} showsVerticalScrollIndicator>
        <Text selectable style={[styles.detailText, failed && styles.failedDetailText]}>
          {text}
        </Text>
      </ScrollView>
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { borderLeftColor: 'transparent', borderLeftWidth: 2 },
    failedRoot: { borderLeftColor: theme.colors.danger },
    row: { alignItems: 'center', flexDirection: 'row', gap: 5, minHeight: 32, paddingHorizontal: 2, paddingVertical: 4 },
    pressed: { opacity: 0.62 },
    label: { color: theme.colors.inkMuted, fontSize: 12 },
    separator: { color: theme.colors.inkFaint, fontSize: 12 },
    title: { color: theme.colors.inkMuted, fontSize: 12 },
    summary: { color: theme.colors.inkMuted, flex: 1, fontSize: 12 },
    state: { alignItems: 'center', flexDirection: 'row', gap: 4, marginLeft: 'auto' },
    dot: { borderRadius: 4, height: 7, width: 7 },
    runningDot: { backgroundColor: theme.colors.warning },
    completedDot: { backgroundColor: theme.colors.success },
    failedDot: { backgroundColor: theme.colors.danger },
    details: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.control,
      marginBottom: 6,
      marginLeft: 20,
      padding: theme.spacing.sm,
    },
    divider: { backgroundColor: theme.colors.border, height: StyleSheet.hairlineWidth },
    payload: { gap: 4 },
    payloadLabel: { color: theme.colors.inkFaint, fontSize: 10, fontWeight: '800' },
    payloadScroll: { maxHeight: 208 },
    detailText: { color: theme.colors.ink, fontFamily: 'Menlo', fontSize: 12, lineHeight: 18 },
    failedDetailText: { color: theme.colors.danger },
  })
