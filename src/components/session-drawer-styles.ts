import type { AppTheme } from '@/theme'
import { textStyle } from '@/theme/text'
import { StyleSheet } from 'react-native'

/**
 * Style sheet for the session drawer and its rows.
 *
 * Kept beside the components rather than inside the drawer module so the row
 * file and the drawer body share one sheet without importing each other.
 */
export const makeSessionDrawerStyles = (theme: AppTheme) =>
  StyleSheet.create({
    drawerFrame: { backgroundColor: theme.colors.drawerBackground, flex: 1, position: 'relative' },
    drawerSafe: { backgroundColor: theme.colors.drawerBackground, flex: 1 },
    drawerScroll: { flex: 1, backgroundColor: theme.colors.drawerBackground },
    drawerHeader: { paddingHorizontal: 8, paddingTop: 4 },
    drawerContent: { flexGrow: 1, paddingBottom: 12, paddingTop: theme.spacing.xs },
    brandRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 60,
      justifyContent: 'space-between',
      paddingLeft: 4,
      paddingVertical: 8,
    },
    brand: { alignItems: 'center', flexDirection: 'row', gap: 6, minWidth: 0 },
    brandWord: { color: theme.colors.ink, fontSize: theme.typography.title, fontWeight: '600', letterSpacing: -0.4 },
    brandTag: {
      backgroundColor: theme.colors.ink,
      borderRadius: theme.radius.xs,
      color: theme.colors.textOnAccent,
      fontSize: theme.typography.eyebrow,
      fontWeight: '700',
      letterSpacing: 0.8,
      paddingHorizontal: 5,
      paddingVertical: 3,
    },
    // `SidebarRoot.module.css .iconButton`: a 28pt square on `radius-sm`, the
    // same box the search and view controls use in the section header.
    topIcon: {
      alignItems: 'center',
      borderRadius: theme.radius.sm,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    newSession: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      minHeight: theme.touch.minTarget,
      marginBottom: 8,
      marginHorizontal: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    // `SidebarRoot.module.css .newSession`: one 14/500 line in a 38-tall bar,
    // white on `bg-base`, 8px 12px, radius 12. The row keeps a 40pt floor so the
    // platform touch target holds while the drawn control matches.
    newSessionText: { color: theme.colors.ink, flexShrink: 1, fontSize: 14, fontWeight: '500', lineHeight: 22 },
    newSessionTextDisabled: {
      color: theme.colors.inkMuted,
      flexShrink: 1,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 22,
    },
    // `WorkspaceBrowser.module.css .sectionHeader`: a 36-tall header row whose
    // three controls are 28pt squares with 16pt glyphs on a 4pt gap.
    workspaceHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 44,
      paddingLeft: 8,
      marginBottom: 4,
    },
    // `WorkspaceBrowser.module.css .sectionLabel` prints the group title in
    // label-tertiary, not label-primary.
    workspaceTitle: { color: theme.colors.inkTertiary, fontSize: 14, fontWeight: '400', lineHeight: 20 },
    workspaceActions: { flexDirection: 'row', gap: 4 },
    actionIcon: {
      alignItems: 'center',
      borderRadius: theme.radius.sm,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    disabledAction: { opacity: 0.45 },
    archivedLabel: { color: theme.colors.inkTertiary },
    searchSkeletons: { padding: 8, gap: 12 },
    searchSkeleton: { minHeight: 44, justifyContent: 'center', gap: 6 },
    skeletonLine: {
      height: 10,
      borderRadius: 4,
      width: '80%',
      marginLeft: 20,
      backgroundColor: theme.colors.surfaceMuted,
    },
    skeletonShort: { width: '55%' },
    listArea: { flexGrow: 1 },
    // `zZw0qq_list` insets the rows by 5px on the trailing edge and 4px leading.
    // `zZw0qq_list`: rows inset 8px on both sides, which is the 264pt column
    // the `SidebarRoot` sidebar paints inside its 280pt frame.
    list: { flexGrow: 1, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 },
    // `Rows.module.css .projectRow`: 34 tall, radius 12, 8px inline padding, and a
    // 16pt leading slot. The margin keeps the Web's 2px inset from the column edge.
    folder: {
      alignItems: 'center',
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      gap: 6,
      minHeight: 44,
      paddingLeft: 9,
      paddingRight: 8,
    },
    folderText: { flex: 1, minWidth: 0, color: theme.colors.ink, fontSize: 14, fontWeight: '400', lineHeight: 20 },
    sessionActions: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.control,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: theme.spacing.xs,
      marginHorizontal: theme.spacing.sm,
      overflow: 'hidden',
    },
    // The desktop's row is 32pt tall with `radius-md`, 8pt inline padding, no gap,
    // and title margins of 4/6 (Rows.module.css:2,118). Drawn at 32 to match, with
    // the vertical hit slop below raising the touch target to 44.
    session: {
      alignItems: 'center',
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      minHeight: 44,
      paddingLeft: 9,
      paddingRight: 8,
    },
    // Desktop rows take `interactive-bg-hover` when selected (Rows.module.css:21)
    // and `interactive-bg-active` while held; a solid fill would not composite
    // over the drawer surface the same way.
    selected: { backgroundColor: theme.colors.interactiveHover },
    rowPressed: { backgroundColor: theme.colors.interactiveActive },
    // The Web's session cell reserves a 16pt leading slot (status dots); a
    // plain mobile row keeps the slot so titles align across grouped and
    // ungrouped workspaces.
    // `.slot`: a 16pt cell holding the row's marker; every session row reserves
    // it so titles line up under the workspace names whether or not the row has
    // a state to print.
    sessionStatus: { alignItems: 'center', flexShrink: 0, height: 20, justifyContent: 'center', width: 16 },
    // `StateDot` in its `ongoing` appearance: a 14pt ring in `label-tertiary`.
    sessionRunningRing: {
      borderColor: theme.colors.inkTertiary,
      borderRadius: 7,
      borderWidth: 1.5,
      height: 14,
      width: 14,
    },
    sessionTitle: { color: theme.colors.ink, flex: 1, fontSize: 14, lineHeight: 20, marginLeft: 4, marginRight: 6 },
    // `.rowResting`: the relative time in the caption tier at the row's right.
    sessionTime: {
      ...textStyle(theme, 'label', 'tertiary'),
      fontSize: 10,
      lineHeight: 16,
      flexShrink: 0,
      marginRight: 2,
    },
    // `.iconButton`: a 24pt square holding a 16pt glyph. The desktop grew this
    // from 20 to 24 with its row-action cell; the glyph stays 16.
    rowAction: {
      alignItems: 'center',
      borderRadius: theme.radius.xs,
      height: 32,
      justifyContent: 'center',
      marginLeft: 4,
      width: 32,
    },
    emptyState: { color: theme.colors.inkMuted, paddingHorizontal: 8, paddingVertical: 24, textAlign: 'center' },
    expandButton: { alignItems: 'center', flexDirection: 'row', gap: 2, paddingHorizontal: 12, paddingVertical: 12 },
    expandText: { color: theme.colors.inkTertiary, fontSize: 13, lineHeight: 20 },
    searchHint: {
      color: theme.colors.inkMuted,
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    // DSH Pocket keeps a drawer action bar pinned to the bottom and draws each
    // action as a bordered pill (34pt tall, 12pt radius, 14pt glyph, 13pt label).
    // The bar keeps the drawer fill so it reads as part of the drawer.
    footer: {
      backgroundColor: theme.colors.drawerBackground,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 8,
      padding: 10,
    },
    footerAction: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      // 44pt rather than Pocket's 34pt: a native control must stay at the
      // platform's minimum touch target.
      gap: 8,
      minHeight: theme.touch.minTarget,
      paddingHorizontal: 12,
    },
    footerActionText: { color: theme.colors.ink, fontSize: 13 },
    // Square companion to the Settings pill: the same 44pt target and 12 radius
    // so the bar keeps one height, with no label to squeeze the row.
    footerSync: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: theme.touch.minTarget,
      width: theme.touch.minTarget,
    },
    footerSyncBusy: { opacity: 0.7 },
    pressed: { opacity: 0.62 },
  })
