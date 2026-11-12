import { NativeIcon } from '@/components/native-icon'
import { diffFenceStat, parseDiffFence, type DiffFenceRow } from '@/components/markdown-diff-fence'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

/** Rows drawn before the fence is clipped; a huge patch scrolls instead of growing. */
const MAX_RENDERED_ROWS = 400

/**
 * Draws a `diff`/`patch` fence as a change to read rather than code to highlight.
 *
 * The row's role picks its tint and gutter bar: additions in the success tint with a
 * leading `+`, deletions in the error tint with `-`, hunk headers and file chrome plain.
 * The marker column stays in the text so copying reproduces the source exactly.
 *
 * @param props.copied - Whether this fence was the last one copied.
 * @param props.copiedSize - Localized confirmation naming the moved line count.
 * @param props.failed - Whether the last copy attempt failed.
 * @param props.onCopy - Copies the whole fence body.
 * @param props.spacing - Top margin separating this fence from the block above it.
 * @param props.text - The fence body, markers included.
 * @returns The diff card.
 */
export function NativeDiffFence({
  copied,
  copiedSize,
  failed,
  onCopy,
  spacing,
  text,
}: {
  copied: boolean
  copiedSize?: string
  failed: boolean
  onCopy: () => void
  spacing: number
  text: string
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const rows = useMemo(() => parseDiffFence(text), [text])
  const stat = useMemo(() => diffFenceStat(rows), [rows])
  const shown = rows.slice(0, MAX_RENDERED_ROWS)
  return (
    <View style={[styles.card, { marginTop: spacing }]}>
      <View style={styles.header}>
        <Text style={styles.language}>{message('markdown.diff')}</Text>
        <Text style={styles.stat}>{format('tool.diffStat', { added: stat.added, removed: stat.removed })}</Text>
        {copiedSize === undefined ? null : (
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.copySize}>
            {copiedSize}
          </Text>
        )}
        <Pressable
          android_ripple={{ borderless: false }}
          accessibilityRole="button"
          accessibilityLabel={
            copied
              ? (copiedSize ?? message('markdown.copied'))
              : failed
                ? message('markdown.copyFailedTitle')
                : message('markdown.copyCode')
          }
          hitSlop={8}
          onPress={onCopy}
          style={styles.copyButton}
        >
          <NativeIcon
            name={copied ? 'check-outline' : 'copy-outline'}
            size={16}
            color={copied ? theme.colors.codeSuccess : failed ? theme.colors.danger : theme.colors.inkMuted}
          />
        </Pressable>
      </View>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator contentContainerStyle={styles.body}>
        <View>
          {shown.map((row, index) => (
            <DiffRowView key={index} row={row} styles={styles} />
          ))}
        </View>
      </ScrollView>
      {rows.length > shown.length ? (
        <Text style={styles.more}>{format('markdown.diffTruncated', { shown: shown.length })}</Text>
      ) : null}
    </View>
  )
}

/** One row, tinted by its role and carrying its marker column verbatim. */
function DiffRowView({ row, styles }: { row: DiffFenceRow; styles: DiffFenceStyles }): React.JSX.Element {
  const rowStyle = row.kind === 'add' ? styles.addedRow : row.kind === 'del' ? styles.removedRow : undefined
  const textStyle =
    row.kind === 'add'
      ? styles.addedText
      : row.kind === 'del'
        ? styles.removedText
        : row.kind === 'hunk'
          ? styles.hunkText
          : undefined
  return (
    <View style={rowStyle === undefined ? styles.row : [styles.row, rowStyle]}>
      <Text selectable style={textStyle === undefined ? styles.text : [styles.text, textStyle]}>
        {row.raw === '' ? ' ' : row.raw}
      </Text>
    </View>
  )
}

type DiffFenceStyles = ReturnType<typeof makeStyles>

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: { backgroundColor: theme.colors.codeBackground, borderRadius: theme.radius.lg, overflow: 'hidden' },
    header: {
      alignItems: 'center',
      backgroundColor: theme.colors.codeBanner,
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 8,
      paddingHorizontal: 18,
      paddingLeft: 22,
      paddingTop: 10,
    },
    language: {
      color: theme.colors.inkTertiary,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      fontWeight: '400',
      lineHeight: 18,
    },
    stat: { color: theme.colors.inkTertiary, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 18 },
    copyButton: { alignItems: 'center', height: 24, justifyContent: 'center', marginLeft: 'auto', width: 24 },
    copySize: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 11, lineHeight: 24 },
    body: { paddingBottom: 16, paddingHorizontal: 16, paddingTop: 8 },
    // The desktop's `.line`: a 3px inset gutter bar keeps the tint off the card edge.
    row: { borderLeftColor: 'transparent', borderLeftWidth: 3, paddingHorizontal: 6, paddingVertical: 1 },
    addedRow: { backgroundColor: theme.colors.codeDiffAdded, borderLeftColor: theme.colors.success },
    removedRow: { backgroundColor: theme.colors.codeDiffDeleted, borderLeftColor: theme.colors.danger },
    text: {
      color: theme.colors.codeForeground,
      flexShrink: 0,
      fontFamily: MONOSPACE_FONT,
      fontSize: 12,
      lineHeight: 19,
      minWidth: 0,
    },
    addedText: { color: theme.colors.success },
    removedText: { color: theme.colors.danger },
    hunkText: { color: theme.colors.inkTertiary },
    more: {
      color: theme.colors.inkTertiary,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      lineHeight: 19,
      paddingBottom: 8,
      paddingHorizontal: 22,
    },
  })
