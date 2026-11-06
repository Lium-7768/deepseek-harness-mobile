import type { ToolFileChange } from '@/components/tool-diff-logic'
import { format } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles } from '@/theme/hooks'
import { MONOSPACE_FONT } from '@/theme/platform'
import { StyleSheet, Text, View } from 'react-native'

/** Lines drawn before the change is cut off; the card scrolls rather than growing without bound. */
const MAX_RENDERED_LINES = 160

/**
 * Draws one derived file change as the desktop's diff card does: removed lines
 * in the error tint, added lines in the success tint, each with a 3px gutter bar
 * and a leading sign, and unchanged lines with no tint.
 *
 * @param props.change - The change derived from the tool call's arguments.
 * @returns The change's path, its line counts, and its lines.
 */
export function NativeDiffBlock({ change }: { change: ToolFileChange }): React.JSX.Element {
  const styles = useThemedStyles(makeStyles)
  const shown = change.lines.slice(0, MAX_RENDERED_LINES)
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text numberOfLines={1} selectable style={styles.path}>
          {change.path}
        </Text>
        <Text style={styles.stat}>{format('tool.diffStat', { added: change.added, removed: change.removed })}</Text>
      </View>
      <View style={styles.body}>
        {shown.map((line, index) => (
          <View
            key={index}
            style={[
              styles.line,
              line.kind === 'added' ? styles.addedLine : line.kind === 'removed' ? styles.removedLine : null,
            ]}
          >
            <Text
              selectable
              style={[
                styles.text,
                line.kind === 'added' ? styles.addedText : line.kind === 'removed' ? styles.removedText : null,
              ]}
            >
              {(line.kind === 'added' ? '+ ' : line.kind === 'removed' ? '- ' : '  ') + line.text}
            </Text>
          </View>
        ))}
        {change.lines.length > shown.length ? (
          <Text style={styles.more}>{format('tool.diffTruncated', { shown: shown.length })}</Text>
        ) : null}
      </View>
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { gap: 4 },
    head: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    // `DiffBlock.module.css .path`: label-secondary at the code weight.
    path: {
      color: theme.colors.inkMuted,
      flex: 1,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      fontWeight: '500',
      lineHeight: 16,
    },
    stat: { color: theme.colors.inkTertiary, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 16 },
    // `DiffBlock.module.css .body`: the code block's own type ramp, padded 6px 0 20px.
    body: { paddingBottom: 6, paddingTop: 2 },
    // `DiffBlock.module.css .line`: 1lh rows padded 22px, with a 3px inset gutter bar.
    line: { borderLeftColor: 'transparent', borderLeftWidth: 3, paddingHorizontal: 22, paddingVertical: 1 },
    // `DiffBlock.module.css`: the tint is `code-diff-*`, but the gutter bar and the
    // line text are `state-*-primary`, not the file-diff marker roles.
    addedLine: { backgroundColor: theme.colors.codeDiffAdded, borderLeftColor: theme.colors.success },
    removedLine: { backgroundColor: theme.colors.codeDiffDeleted, borderLeftColor: theme.colors.danger },
    text: { color: theme.colors.inkMuted, fontFamily: MONOSPACE_FONT, fontSize: 11, lineHeight: 19 },
    addedText: { color: theme.colors.success },
    removedText: { color: theme.colors.danger },
    more: {
      color: theme.colors.inkTertiary,
      fontFamily: MONOSPACE_FONT,
      fontSize: 11,
      lineHeight: 19,
      paddingHorizontal: 22,
    },
  })
