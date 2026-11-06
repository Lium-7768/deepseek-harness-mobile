import { highlightCode, codeTokenColor } from './code-highlighting'
import {
  parseBlocks,
  tableLayout,
  markdownBlockGap,
  markdownLinkTarget,
  type Block,
} from '@/components/markdown-blocks'
import { tableToTsv } from '@/components/markdown-table-logic'
import { copyCodeLabel, copyTableLabel, measureCopy } from '@/components/copy-feedback'
import { tapFeedback } from '@/components/haptics'
import { NativeIcon } from '@/components/native-icon'
import { format, t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import { FIXED_GEOMETRY_FONT_CAP } from '@/theme/text-scale'
import * as Clipboard from 'expo-clipboard'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useWindowDimensions,
  AccessibilityInfo,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
function wrapInlineCode(text: string): string {
  return text.replace(/([/_.:,;=?&-])/g, '$1\u200B')
}

function inline(text: string, key: string, styles: ReturnType<typeof makeStyles>): React.JSX.Element[] {
  const re = /(\[[^\]]+\]\([^\)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g
  const out: React.JSX.Element[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index > cursor) out.push(<Text key={`${key}-p-${cursor}`}>{text.slice(cursor, match.index)}</Text>)
    const token = match[0]
    if (token.startsWith('[')) {
      const link = markdownLinkTarget(token)
      out.push(
        <Text
          key={`${key}-l-${match.index}`}
          style={link.url ? styles.link : undefined}
          accessibilityRole={link.url ? 'link' : undefined}
          onPress={
            link.url
              ? () => {
                  void Linking.openURL(link.url!).catch(() =>
                    AccessibilityInfo.announceForAccessibility(message('markdown.openLinkFailed')),
                  )
                }
              : undefined
          }
        >
          {link.label}
        </Text>,
      )
    } else if (token.startsWith('`'))
      out.push(
        <Text key={`${key}-c-${match.index}`} style={styles.inlineCode}>
          {wrapInlineCode(token.slice(1, -1))}
        </Text>,
      )
    else if (token.startsWith('**') || token.startsWith('__'))
      out.push(
        <Text key={`${key}-b-${match.index}`} style={styles.bold}>
          {token.slice(2, -2)}
        </Text>,
      )
    else
      out.push(
        <Text key={`${key}-i-${match.index}`} style={styles.italic}>
          {token.slice(1, -1)}
        </Text>,
      )
    cursor = match.index + token.length
  }
  if (cursor < text.length) out.push(<Text key={`${key}-tail`}>{text.slice(cursor)}</Text>)
  return out.length ? out : [<Text key={`${key}-all`}>{text}</Text>]
}
export function NativeMarkdown({
  markdown,
  onCopyCode,
}: {
  markdown: string
  onCopyCode?: (code: string) => void | Promise<void>
}): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  // The phone cannot show which lines a copy took, so the block names the count.
  const [copiedSize, setCopiedSize] = useState<string | undefined>(undefined)
  const [copyFailedIndex, setCopyFailedIndex] = useState<number | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    },
    [],
  )
  // Parsing is pure in `markdown`, so it runs once per answer rather than once
  // per render; a streamed message re-renders on every token.
  const blocks = useMemo(() => parseBlocks(markdown), [markdown])
  const copy = async (index: number, code: string): Promise<void> => {
    if (copiedIndex === index) return
    const label = copyCodeLabel(measureCopy(code).lines)
    try {
      if (onCopyCode) await onCopyCode(code)
      else await Clipboard.setStringAsync(code)
      tapFeedback()
      setCopiedIndex(index)
      setCopiedSize(label)
      setCopyFailedIndex(null)
      void AccessibilityInfo.announceForAccessibility(label)
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => {
        copyTimer.current = null
        setCopiedIndex(null)
        setCopiedSize(undefined)
      }, 1200)
    } catch {
      setCopyFailedIndex(index)
      void AccessibilityInfo.announceForAccessibility(message('markdown.copyFailed'))
    }
  }
  return (
    <View style={styles.root}>
      {blocks.map((block, index) => {
        const spacing = { marginTop: markdownBlockGap(block, blocks[index - 1]) }
        const key = `md-${index}`
        if (block.kind === 'code') {
          const copied = copiedIndex === index
          const failed = copyFailedIndex === index
          return (
            <NativeCodeBlock
              key={key}
              spacing={spacing.marginTop}
              copied={copied}
              copiedSize={copied === true ? copiedSize : undefined}
              failed={failed}
              language={block.language}
              onCopy={() => void copy(index, block.text)}
              text={block.text}
            />
          )
        }
        const content = block.kind === 'list' ? [] : inline(block.text, key, styles)
        if (block.kind === 'heading')
          return (
            <Text
              key={key}
              selectable
              style={[
                styles.heading,
                spacing,
                block.level === 1
                  ? styles.h1
                  : block.level === 2
                    ? styles.h2
                    : block.level === 3
                      ? styles.h3
                      : styles.h4,
              ]}
            >
              {content}
            </Text>
          )
        if (block.kind === 'rule') return <View key={key} style={[styles.rule, spacing]} />
        if (block.kind === 'quote')
          return (
            <View key={key} style={[styles.quote, spacing]}>
              <Text selectable style={styles.quoteText}>
                {content}
              </Text>
            </View>
          )
        if (block.kind === 'list')
          return (
            <View key={key} style={[styles.list, spacing]}>
              {(block.items ?? []).map((item, itemIndex) => (
                <View key={`${key}-${itemIndex}`} style={styles.listRow}>
                  <Text style={styles.marker}>{item.marker}</Text>
                  <Text selectable style={[styles.body, styles.listBody]}>
                    {inline(item.text, `${key}-${itemIndex}`, styles)}
                  </Text>
                </View>
              ))}
            </View>
          )
        if (block.kind === 'table')
          return (
            <View key={key} style={spacing}>
              <NativeTable block={block} styles={styles} />
            </View>
          )
        return (
          <Text key={key} selectable style={[styles.body, spacing]}>
            {content}
          </Text>
        )
      })}
    </View>
  )
}
/**
 * Renders one markdown table.
 *
 * The desktop's table keeps `border-collapse` rows separated by hairline rules
 * (`MarkdownText.module.css .tableScroll`): a header row on `border-l3`, body
 * rows on `border-l2`, `10px 16px` cells with no leading pad on the first column
 * and no trailing pad on the last. A table narrower than four columns fills the
 * column; a wider one keeps a readable cell floor and scrolls sideways.
 *
 * @param props - The parsed table and the shared markdown styles.
 * @returns The rendered table.
 */
function NativeTable({ block, styles }: { block: Block; styles: ReturnType<typeof makeStyles> }): React.JSX.Element {
  const theme = useAppTheme()
  const header = block.header ?? []
  const rows = block.rows ?? []
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const [copiedSize, setCopiedSize] = useState<string | undefined>(undefined)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    },
    [],
  )
  // One press copies the whole table: dragging cell by cell is the only alternative,
  // and a TSV block pastes into a spreadsheet as real columns.
  const copyTable = async (): Promise<void> => {
    if (copied) return
    const label = copyTableLabel({
      rows: rows.length,
      columns: Math.max(header.length, ...rows.map((row) => row.length)),
    })
    try {
      await Clipboard.setStringAsync(tableToTsv({ header, rows }))
      tapFeedback()
      setCopied(true)
      setFailed(false)
      setCopiedSize(label)
      void AccessibilityInfo.announceForAccessibility(label)
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => {
        copyTimer.current = null
        setCopied(false)
        setCopiedSize(undefined)
      }, 1200)
    } catch {
      setFailed(true)
      void AccessibilityInfo.announceForAccessibility(message('markdown.copyFailed'))
    }
  }
  const { width, fontScale } = useWindowDimensions()
  const layout = tableLayout(block)
  const { align, columns } = layout
  const fills = layout.fills && (columns === 1 || (width - 40) / Math.max(1, fontScale) >= columns * 120)
  const cellStyle = (column: number): object[] => {
    const side = align[column]
    const edges: object[] = []
    if (column === 0) edges.push(styles.tableCellFirst)
    if (column === columns - 1) edges.push(styles.tableCellLast)
    if (columns === 1) edges.push(styles.tableCellOnly)
    return [
      styles.tableCell,
      fills ? styles.tableCellFill : styles.tableCellScroll,
      side === 'center' ? styles.tableCenter : side === 'right' ? styles.tableRight : styles.tableLeft,
      ...edges,
    ]
  }
  const cells = (row: string[], rowKey: string, heading: boolean): React.JSX.Element[] =>
    Array.from({ length: columns }, (_, column) => (
      <View key={`${rowKey}-${column}`} style={cellStyle(column)}>
        <Text
          maxFontSizeMultiplier={FIXED_GEOMETRY_FONT_CAP}
          selectable
          style={heading ? styles.tableHeadText : styles.tableText}
        >
          {inline(row[column] ?? '', `${rowKey}-${column}`, styles)}
        </Text>
      </View>
    ))
  const table = (
    <View style={[styles.table, fills ? styles.tableFill : null]}>
      <View style={[styles.tableRow, styles.tableHeadRow]}>{cells(header, 'head', true)}</View>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.tableRow}>
          {cells(row, `row-${rowIndex}`, false)}
        </View>
      ))}
    </View>
  )
  // A filling table shares the column width, so its cells wrap. A scrollable one
  // needs its natural width: a horizontal scroll view hands its content unbounded
  // width, which would collapse the wrapping cells instead of dividing the row.
  const body = fills ? (
    table
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
      {table}
    </ScrollView>
  )
  return (
    <View style={styles.tableCard}>
      {body}
      {/* The confirmation sits in the same floating corner as the control, so naming the
          size costs the grid no height and cannot reflow a wide table. */}
      <View style={styles.tableActions}>
        {copiedSize === undefined ? null : (
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.tableCopySize}>
            {copiedSize}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? (copiedSize ?? message('markdown.tableCopied')) : message('markdown.copyTable')}
          accessibilityState={{ selected: copied }}
          hitSlop={8}
          onPress={() => void copyTable()}
          style={styles.tableCopy}
        >
          <NativeIcon
            name={copied ? 'check-outline' : 'copy-outline'}
            size={14}
            color={copied ? theme.colors.success : failed ? theme.colors.danger : theme.colors.inkMuted}
          />
        </Pressable>
      </View>
    </View>
  )
}

function NativeCodeBlock({
  copied,
  copiedSize,
  failed,
  spacing,
  language,
  onCopy,
  text,
}: {
  copied: boolean
  /** Localized copy confirmation naming the moved line count. */
  copiedSize?: string
  spacing: number
  failed: boolean
  language?: string
  onCopy: () => void
  text: string
}): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const [expanded, setExpanded] = useState(false)
  const tokens = useMemo(() => highlightCode(text, language), [text, language])
  const lineCount = text.split('\n').length
  const collapsible = lineCount > 16
  return (
    <View style={[styles.codeCard, { marginTop: spacing }]}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLanguage}>{language || message('markdown.code')}</Text>
        {copiedSize === undefined ? null : (
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.copySize}>
            {copiedSize}
          </Text>
        )}
        <Pressable
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
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator contentContainerStyle={styles.codeBody}>
        <Text selectable numberOfLines={collapsible && !expanded ? 16 : undefined} style={styles.codeText}>
          {tokens.map((token, index) => (
            <Text key={index} style={{ color: codeTokenColor(theme, token.kind) }}>
              {token.text}
            </Text>
          ))}
        </Text>
      </ScrollView>
      {collapsible && !expanded ? (
        // `numberOfLines` clips silently, so a reader would otherwise believe the block
        // ends at the fold. The count is what the fold hides, not the total.
        <Text style={styles.codeHiddenHint}>{format('markdown.hiddenLines', { count: lineCount - 16 })}</Text>
      ) : null}
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? message('markdown.collapseBlock') : message('markdown.expandBlock')}
          onPress={() => setExpanded((value) => !value)}
          style={styles.codeToggle}
        >
          <Text style={styles.codeToggleText}>
            {expanded ? message('markdown.collapse') : format('markdown.expandAll', { count: lineCount })}
          </Text>
          <NativeIcon
            name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={15}
            color={theme.colors.codeInteractive}
          />
        </Pressable>
      ) : null}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Block spacing follows MarkdownText.module.css: 16px between blocks, 32/16
    // around h1–h3, 16/16 around h4, and 6px between list entries.
    root: { minWidth: 0 },
    body: {
      color: theme.colors.ink,
      flexShrink: 1,
      fontSize: theme.typography.message,
      lineHeight: theme.typography.lineMessage,
    },
    heading: { color: theme.colors.ink, fontWeight: '600' },
    h1: { fontSize: 21, lineHeight: 30 },
    h2: { fontSize: 19, lineHeight: 28 },
    h3: { fontSize: 18, lineHeight: 26 },
    // h4–h6 share the body size at 600 (gradient-shadow-text `markdown-h4`).
    h4: { fontSize: theme.typography.message, fontWeight: '600', lineHeight: theme.typography.lineMessage },
    bold: { fontWeight: '600' },
    italic: { fontStyle: 'italic' },
    // Links are the desktop's `--dsw-alias-link`, medium, and undecorated.
    link: { color: theme.colors.accent, fontWeight: '500' },
    inlineCode: {
      backgroundColor: theme.colors.codeInline,
      borderColor: theme.colors.borderHairline,
      borderRadius: theme.radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      fontFamily: MONOSPACE_FONT,
      fontSize: 12,
      paddingHorizontal: 5,
    },
    quote: {
      borderLeftColor: theme.colors.quoteBorder,
      borderLeftWidth: 2,
      paddingLeft: 14,
    },
    quoteText: { color: theme.colors.inkMuted, fontStyle: 'italic', lineHeight: theme.typography.lineMessage },
    list: { gap: 6 },
    listRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 6, width: '100%' },
    listBody: { flex: 1, minWidth: 0 },
    // The desktop's markers are `label-secondary`, on the body line.
    marker: {
      color: theme.colors.inkMuted,
      fontSize: theme.typography.message,
      lineHeight: theme.typography.lineMessage,
      minWidth: 12,
    },
    rule: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
    },
    // CodeBlock.module.css: 16px radius, a 9/14 banner strip, and a 16px body.
    codeCard: { backgroundColor: theme.colors.codeBackground, borderRadius: theme.radius.lg, overflow: 'hidden' },
    // `CodeCard.module.css .header`: 10px 18px 8px 22px, so the banner's label sits
    // 22 from the card's left edge and its action 18 from the right.
    codeHeader: {
      alignItems: 'center',
      backgroundColor: theme.colors.codeBanner,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 8,
      paddingHorizontal: 18,
      paddingLeft: 22,
      paddingTop: 10,
    },
    // `CodeCard.module.css .language`: the banner label is label-tertiary, not the code's
    // own foreground; the copy action beside it is label-secondary.
    codeLanguage: {
      color: theme.colors.inkTertiary,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      fontWeight: '400',
      lineHeight: 18,
    },
    copyButton: {
      alignItems: 'center',
      height: 24,
      justifyContent: 'center',
      width: 24,
    },
    // The confirmation shares the header's 24pt row, so the card height is unchanged
    // while the size comes and goes.
    copySize: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 11, lineHeight: 24, marginLeft: 'auto' },
    // `CodeCard.module.css .body`: 6px 22px 20px, so the last line clears the card's
    // rounded bottom instead of sitting 22px off it.
    codeBody: { paddingBottom: 16, paddingHorizontal: 16, paddingTop: 8 },
    codeText: {
      color: theme.colors.codeForeground,
      flexShrink: 0,
      fontFamily: MONOSPACE_FONT,
      fontSize: 12,
      lineHeight: 19,
      minWidth: 0,
    },
    codeToggle: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
      justifyContent: 'center',
      minHeight: theme.touch.minTarget,
    },
    codeHiddenHint: {
      color: theme.colors.inkMuted,
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: 12,
      paddingTop: 4,
    },
    codeToggleText: { color: theme.colors.accent, fontSize: 12, fontWeight: '500' },
    // `MarkdownText.module.css .tableScroll`: the wrapper clips, and a table
    // narrower than four columns fills the column.
    tableCard: { minWidth: 0 },
    // The control owns a row above the grid, the way a code block owns its header: a
    // floating corner button covered the last column's header text.
    tableActions: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'flex-end', minHeight: 22 },
    tableCopy: {
      alignItems: 'center',
      borderRadius: theme.radius.sm,
      height: 22,
      justifyContent: 'center',
      width: 22,
    },
    tableCopySize: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 11, lineHeight: 22 },
    tableScroll: { flexGrow: 0, maxWidth: '100%' },
    table: { flexDirection: 'column' },
    tableFill: { alignSelf: 'stretch' },
    tableRow: { flexDirection: 'row' },
    // Header cells sit on a `border-l3` rule; body cells on `border-l2`.
    tableHeadRow: { borderBottomColor: theme.colors.borderL3, borderBottomWidth: StyleSheet.hairlineWidth },
    tableCell: {
      borderBottomColor: theme.colors.borderL2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    tableCellFill: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 100 },
    // A scrollable table keeps its natural width with the desktop's cell floor.
    tableCellScroll: { flexGrow: 0, flexShrink: 0, width: 140 },
    tableCellFirst: { paddingLeft: 0 },
    tableCellLast: { paddingRight: 0 },
    tableCellOnly: { paddingRight: 16 },
    tableLeft: { alignItems: 'flex-start' },
    tableCenter: { alignItems: 'center' },
    tableRight: { alignItems: 'flex-end' },
    // Desktop `MarkdownText.module.css` prints a cell with `--dsw-font-markdown-table`
    // (500 13px/22px for `th`, 400 13px/22px for `td`), one step below the 15px body.
    // The phone's body is 14, so the table keeps the same one-step gap at 13.
    tableHeadText: { color: theme.colors.ink, fontSize: 13, fontWeight: '500', lineHeight: 22 },
    tableText: { color: theme.colors.ink, fontSize: 13, lineHeight: 22 },
  })
