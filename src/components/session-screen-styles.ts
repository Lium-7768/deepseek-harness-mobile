import type { AppTheme } from '@/theme'
import { StyleSheet } from 'react-native'

export const makeSessionStyles = (theme: AppTheme) =>
  StyleSheet.create({
    composerContext: { gap: 6, marginBottom: 6 },
    canvas: { flex: 1 },
    processMembers: { gap: 4 },
    hidden: { display: 'none' },
    // pushing the control out of the row.
    // `MessageIconActions.module.css .actions`: 28 tall, 8px between controls,
    // each control a 28pt square with 6px of padding inside it.
    actionRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      maxWidth: '100%',
      minHeight: 28,
    },
    actionRowAssistant: { alignSelf: 'flex-start' },
    actionRowUser: { alignSelf: 'flex-end' },
    // The Web prints the user's own time at 13/24 in the action row and the
    // assistant tail time at 12/24 (`MessageItem` `.time` / `.endInfo`).
    // `.timeStart` (user) prints 13/24 tertiary with 12px of trailing padding;
    // `.timeEnd` (assistant tail) prints one step smaller on the same line.
    actionTime: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 12, lineHeight: 24, minWidth: 0 },
    actionTimeUser: { fontSize: 13, paddingRight: 12 },
    actionTimeEnd: { marginLeft: 8 },
    // The copy confirmation names what reached the clipboard; it shares the clock's
    // 12/24 slot so the action row keeps its height while the label comes and goes.
    actionCopySize: { color: theme.colors.inkTertiary, flexShrink: 1, fontSize: 12, lineHeight: 24, minWidth: 0 },
    error: { color: theme.colors.danger, padding: 12 },
    errorNotice: { gap: 6, paddingHorizontal: 12 },
    unavailable: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center', padding: 28 },
    unavailableText: { color: theme.colors.inkTertiary, fontSize: 14, lineHeight: 22, textAlign: 'center' },
    unavailableAction: { minWidth: 132 },
    // `.action` is a 28pt square whose 6px padding leaves a 15–16pt glyph.
    actionButton: { alignItems: 'center', justifyContent: 'center', padding: 6 },
    listStage: { flex: 1, position: 'relative' },
    listView: { flex: 1 },
    returnToLatestPressed: { backgroundColor: theme.colors.floatingHover },
    returnToLatest: {
      alignItems: 'center',
      // The desktop's floating control fill (ChatView.module.css:422).
      backgroundColor: theme.colors.floating,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      bottom: theme.spacing.md,
      height: 40,
      justifyContent: 'center',
      position: 'absolute',
      right: theme.spacing.lg,
      width: 40,
      ...theme.elevation.card,
    },
    // The badge sits on the control's top-left corner so it never covers the chevron.
    returnToLatestBadge: {
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.pill,
      justifyContent: 'center',
      minWidth: 18,
      paddingHorizontal: 4,
      position: 'absolute',
      right: 26,
      top: -6,
    },
    returnToLatestBadgeText: { color: theme.colors.onAccent, fontSize: 10, fontWeight: '600', lineHeight: 14 },
    // The desktop prints this as plain 12px secondary text, not a filled control.
    // `ChatView` prints 加载更早 as a 12/400 secondary chip on `bg-overlay`
    // (4px 12px, radius 8). The 44pt floor keeps the platform touch target.
    loadOlder: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: theme.colors.floatingHover,
      borderRadius: theme.radius.sm,
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      minHeight: theme.touch.minTarget,
      paddingHorizontal: theme.spacing.md,
    },
    loadOlderText: { color: theme.colors.inkMuted, fontSize: 12, lineHeight: 20 },
    // ChatView.module.css spaces flow items by 12px behind 32px gutters. The
    // composer sits on 16px, so the text column is the narrower of the two, as on
    // the desktop.
    list: {
      paddingHorizontal: 20,
      paddingVertical: theme.spacing.lg,
    },
    empty: { color: theme.colors.inkTertiary, paddingVertical: 24, textAlign: 'center' },
    assistantRow: { gap: theme.spacing.lg, maxWidth: '100%', minWidth: 0, width: '100%' },
    userRow: { alignItems: 'flex-end', gap: 6, maxWidth: '100%' },
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.userBubble,
      borderRadius: theme.radius.xl,
      maxWidth: '88%',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    // The desktop bubble sets its own 22px line, one step tighter than body text.
    userText: { color: theme.colors.ink, fontSize: theme.typography.message, lineHeight: 24 },
    // One chip per reference the message carried, right-aligned above the bubble the
    // way the desktop prints them.
    referenceRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
    referenceChip: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      flexDirection: 'row',
      gap: 4,
      maxWidth: 220,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    referenceText: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 12, lineHeight: 18 },
    toolRow: { maxWidth: '100%' },
    turnStatusSlot: { paddingTop: 16, paddingBottom: 8 },
    // `InputBar.dock`: one centred row 12px apart with 4px of top pad holding the
    // statistics pills and the context meter. It never wraps: a reading that
    // runs out of width ellipsizes, as `StatsPills .label` does on the Web.
    // `min-height: 22` reserves the readings' row, so the composer keeps one
    // height whether or not the projections have landed yet.
    dock: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'center',
      maxWidth: '100%',
      minHeight: 22,
      paddingTop: 4,
    },
    status: { alignItems: 'center', flexDirection: 'row', gap: 5 },
    statusDot: { backgroundColor: theme.colors.success, borderRadius: 4, height: 7, width: 7 },
    statusPending: { backgroundColor: theme.colors.warning },
    statusOffline: { backgroundColor: theme.colors.inkFaint },
    statusText: { color: theme.colors.inkMuted, fontSize: 11, lineHeight: 16 },
    pressed: { opacity: 0.62 },
  })
