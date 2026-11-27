import type { NativeIconName } from '@/components/native-icon'
import { NativeIcon } from '@/components/native-icon'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

/** One dot-separated trailing segment on a 24pt disclosure header. */
export type FlowHeaderSegment = {
  readonly text: string
  /** When true, the segment fills remaining row width before ellipsizing. */
  readonly flex?: boolean
  readonly tone?: 'tertiary' | 'danger'
}

type Props = {
  /** Business glyph the row leads with while closed. */
  icon: NativeIconName
  /** Row title: the activity, role, or tool verb, in the tertiary reading. */
  title: string
  /** Trailing one-line summary, after the dot separator; omitted reads as a bare title. */
  summary?: string
  /** Explicit dot-separated trailing segments (e.g. producer + notice summary). */
  headerSegments?: readonly FlowHeaderSegment[]
  open: boolean
  /**
   * Matches desktop `DisclosureRow.keepContentWhenOpen` (default `false`):
   * reasoning rows hide their summary when expanded, while tool and context rows keep theirs.
   */
  keepContentWhenOpen?: boolean
  /** Optional color override for the chevron icon when open. */
  openIconColor?: string
  /** Optional extra bottom padding on the root when open (desktop ContextInjectionRow uses 4). */
  openPaddingBottom?: number
  /** Optional style override for the indented body container. */
  bodyStyle?: StyleProp<ViewStyle>
  /** Whether the row opens a body; a bare row stays inert. */
  expandable?: boolean
  onToggle?: () => void
  /** Failure tone the desktop gives a failed call's summary. */
  tone?: 'tertiary' | 'danger'
  /** Accessible name for the disclosure, naming what it reveals. */
  accessibilityLabel: string
  /** Optional trailing capsule on the header line (e.g. a non-zero exit badge). */
  trailing?: React.ReactNode
  /** The body the row reveals while open. */
  children?: React.ReactNode
}

/**
 * Renders one 24pt process row mirroring desktop's `DisclosureRow`.
 */
export function NativeFlowRow({
  accessibilityLabel,
  bodyStyle,
  children,
  expandable = true,
  headerSegments,
  icon,
  keepContentWhenOpen = false,
  onToggle,
  open,
  openIconColor,
  openPaddingBottom,
  summary,
  title,
  tone = 'tertiary',
  trailing,
}: Props): React.JSX.Element {
  const theme = useAppTheme()
  const s = useThemedStyles(makeStyles)
  const interactive = expandable && onToggle !== undefined
  const glyph: NativeIconName = open ? 'chevron-up-outline' : icon
  const iconColor =
    open && openIconColor !== undefined
      ? openIconColor
      : tone === 'danger'
        ? theme.colors.danger
        : theme.colors.inkTertiary
  const segments: readonly FlowHeaderSegment[] =
    headerSegments !== undefined
      ? headerSegments.filter((segment) => segment.text !== '')
      : summary !== undefined && summary !== ''
        ? [{ text: summary, flex: true, tone }]
        : []
  const showSegments = segments.length > 0 && (!open || keepContentWhenOpen)
  const row = (
    <>
      <View style={s.leading}>
        <NativeIcon color={iconColor} name={glyph} size={14} />
      </View>
      <Text numberOfLines={1} style={[s.title, showSegments && s.titleFixed]}>
        {title}
      </Text>
      {showSegments
        ? segments.map((segment, index) => (
            <View key={`${index}-${segment.text}`} style={segment.flex ? s.segmentFlexWrap : s.segmentWrap}>
              <View style={s.dot} />
              <Text
                numberOfLines={1}
                style={[segment.flex ? s.summary : s.segmentFixed, (segment.tone ?? tone) === 'danger' && s.danger]}
              >
                {segment.text}
              </Text>
            </View>
          ))
        : null}
      {trailing}
    </>
  )
  return (
    <View style={[s.root, open && openPaddingBottom !== undefined ? { paddingBottom: openPaddingBottom } : null]}>
      {interactive ? (
        <Pressable
          android_ripple={{ borderless: false }}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          hitSlop={{ top: 8, bottom: 8 }}
          onPress={onToggle}
          style={({ pressed }) => [s.row, pressed && s.pressed]}
        >
          {row}
        </Pressable>
      ) : (
        <View style={s.row}>{row}</View>
      )}
      {open && children !== undefined ? <View style={[s.body, bodyStyle]}>{children}</View> : null}
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { minWidth: 0 },
    // `DisclosureRow .row`: one 24pt line, tertiary reading.
    row: { alignItems: 'center', flexDirection: 'row', minHeight: 24, minWidth: 0 },
    // `DisclosureRow .leading`: a 16pt box holding a 14pt glyph, 6pt before the title.
    leading: { alignItems: 'center', height: 16, justifyContent: 'center', marginRight: 6, width: 16 },
    title: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 13, lineHeight: 24 },
    titleFixed: { flexShrink: 0 },
    // `DisclosureRow .separator`: 2×2 dot, `label-caption`, 8pt either side.
    dot: { backgroundColor: theme.colors.inkFaint, borderRadius: 1, height: 2, marginHorizontal: 8, width: 2 },
    segmentWrap: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, minWidth: 0 },
    segmentFlexWrap: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
    segmentFixed: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 13, lineHeight: 24, minWidth: 0 },
    summary: { color: theme.colors.inkTertiary, flex: 1, fontSize: 13, lineHeight: 24, minWidth: 0 },
    danger: { color: theme.colors.danger },
    // `DisclosureRow` / `ReasoningRow .thinkBody`: 4pt above and below, indented 22pt.
    body: { gap: 8, paddingBottom: 4, paddingLeft: 22, paddingTop: 4 },
    pressed: { opacity: 0.62 },
  })
