import type { AppTheme } from '@/theme'
import { MONOSPACE_FONT } from '@/theme/platform'
import { StyleSheet } from 'react-native'

export const makeSettingsStyles = (theme: AppTheme) =>
  StyleSheet.create({
    back: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
    // `SettingsRoot.module.css .options` at phone width: 16px sides, 24px under
    // the column, no top padding — the section bar's own 14px carries the gap.
    list: { gap: theme.spacing.sm, paddingBottom: theme.spacing.xl, paddingHorizontal: 16 },
    header: { gap: 4, marginBottom: theme.spacing.sm },
    subtitle: { color: theme.colors.inkTertiary, fontSize: 13, lineHeight: 20 },
    // The Web's models page prints its intro at 14/400 on a 22px line.
    // 22px title line, 20px glyph: 1px of lead puts the glyph on the title's centre.
    // The desktop's preset row carries the default marker as an inverted pill, the
    // shipped marker as an outlined one, and the raw id right-aligned as code.
    presetHead: { flexWrap: 'wrap', alignItems: 'center', flexDirection: 'row', gap: 6 },
    presetDefaultTag: {
      backgroundColor: theme.colors.brand,
      borderRadius: theme.radius.pill,
      color: theme.colors.onBrand,
      fontSize: 11,
      fontWeight: '500',
      lineHeight: 17,
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 1,
    },
    presetTag: {
      borderColor: theme.colors.settingsCardStroke,
      borderRadius: theme.radius.pill,
      borderWidth: 0.5,
      color: theme.colors.inkTertiary,
      fontSize: 11,
      fontWeight: '500',
      lineHeight: 17,
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 1,
    },

    // One preset is one hairlined row: name, its shipped/default tag, a
    // two-line summary, and a chevron into the descriptor. The card, its raw id
    // line, and its three footer controls repeated what the row already says.
    presetRow: {
      alignItems: 'center',
      borderBottomColor: theme.colors.borderHairline,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingVertical: 12,
    },
    presetRowText: { flex: 1, gap: 2, minWidth: 0 },
    section: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
      padding: 14,
    },
    // Web 内置插件 page at phone width: 16pt gutters, the intro line, then the
    // search field; each namespace is one hairlined row, not a card — the card
    // per entry spent 52pt naming what a single line already says.
    pluginList: { gap: 12, paddingBottom: theme.spacing.xxl, paddingHorizontal: 16, paddingTop: 12 },
    pluginIntro: { color: theme.colors.inkTertiary, fontSize: 13, lineHeight: 18 },
    // `k8jdEW_search`: 36 tall, 12 radius, hairline `border-l4` outline on the
    // layer-1 fill, glyph 12 in from the edge, 13px input starting at 36.
    pluginSearch: {
      alignItems: 'center',
      backgroundColor: theme.colors.settingsCardFill,
      borderColor: theme.colors.settingsCardStroke,
      borderRadius: theme.radius.md,
      borderWidth: 0.5,
      flexDirection: 'row',
      gap: 10,
      minHeight: 44,
      paddingLeft: 12,
      paddingRight: 34,
    },
    pluginSearchInput: {
      color: theme.colors.ink,
      flex: 1,
      fontSize: 14,
      minHeight: 44,
      paddingVertical: 8,
      paddingHorizontal: 0,
    },
    pluginRow: {
      alignItems: 'center',
      borderBottomColor: theme.colors.borderHairline,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingVertical: 12,
    },
    pluginRowText: { flex: 1, gap: 2, minWidth: 0 },
    pluginRowLabel: { color: theme.colors.ink, fontSize: 14, fontWeight: '500', lineHeight: 20 },
    pluginRowIdentity: { color: theme.colors.inkTertiary, fontFamily: MONOSPACE_FONT, fontSize: 12, lineHeight: 18 },
    // `_tag_brmue_4`: 11/17 on `surfaceMuted`, 1px 8px padding, pill radius.
    pluginCardTag: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.pill,
      color: theme.colors.inkMuted,
      fontSize: 11,
      fontWeight: '500',
      lineHeight: 17,
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 1,
    },
    // Panel heading: the Web's models and presets pages print 16/500 on a 24px
    // line, the plugins page 18/600 (`T4WTQq_heading`).
    sectionTitle: { color: theme.colors.ink, fontSize: 20, fontWeight: '600', lineHeight: 28 },
    // `XzvN5G_card`: radius 20, hairline `settings-card-stroke` outline on the
    // card fill, the main block padded 14/16/12 and the footer under a divider.
    // `cardMain`: 14px 16px 12px, 12pt between the head row and the body.
    // `cardFoot`: 6px 10px under a hairline, 36pt ghost actions, 28pt icon.
    presetName: { color: theme.colors.ink, fontSize: 15, fontWeight: '600', lineHeight: 21 },
    presetBody: { color: theme.colors.inkMuted, fontSize: 13, lineHeight: 20 },
    readOnlyBlock: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 3,
      paddingVertical: theme.spacing.md,
    },
    readOnlyHead: {
      alignItems: 'baseline',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    readOnlyTitle: { color: theme.colors.ink, flexShrink: 1, fontSize: theme.typography.body, fontWeight: '400' },
    readOnlyDetail: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    optionSelected: { backgroundColor: theme.colors.surfaceActive, borderColor: theme.colors.accent },
    // `AgentPresetSection.module.css .groupHead`: 12/600, tertiary, uppercase
    // with .06em tracking. Chinese has no case, so only the tracking carries.
    groupTitle: {
      color: theme.colors.inkTertiary,
      fontSize: theme.typography.caption,
      fontWeight: '600',
      letterSpacing: 0.72,
      lineHeight: 18,
      marginHorizontal: theme.spacing.sm,
    },
    cardHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 8,
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    connectionCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.control,
      borderWidth: StyleSheet.hairlineWidth,
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    cardTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 24 },
    connected: { alignItems: 'center', flexDirection: 'row', gap: 5 },
    dot: { borderRadius: 4, height: 7, width: 7 },
    dotConnected: { backgroundColor: theme.colors.success },
    dotDisconnected: { backgroundColor: theme.colors.inkFaint },
    connectedText: { color: theme.colors.successText, fontSize: 11, fontWeight: '500', lineHeight: 16 },
    disconnectedText: { color: theme.colors.inkMuted },
    // One fact per pair: a 12/18 tertiary name over its value, 2pt apart, so the
    // eye reads two groups instead of four sibling lines.
    connectionField: { gap: 2 },
    label: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    value: { color: theme.colors.ink, fontSize: 13, lineHeight: 18 },
    // Web mobile: title 16/500, close glyph at the trailing edge, section bar
    // directly beneath it with the selected tab on a muted fill.
    close: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 },
    // `navList` at phone width: 12px above, 14px under, 16px at the ends.
    tabs: { backgroundColor: theme.colors.background, paddingBottom: 14, paddingTop: 12 },
    tabsContent: { gap: 4, paddingHorizontal: 16 },
    // `SettingsRoot.module.css .navCell`: 0 14px, gap 8, radius 12, 40 tall.
    tab: {
      alignItems: 'center',
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      gap: 8,
      minHeight: 40,
      paddingHorizontal: 14,
    },
    // The Web marks the current section with `bg-layer-1` (rgb(235,238,242)),
    // one step above the panel fill; `surfaceMuted` would read as an unselected
    // hover.
    tabSelected: { backgroundColor: theme.colors.surfaceActive },
    tabLabel: { color: theme.colors.ink, fontSize: 14, lineHeight: 22 },
    // Desktop Settings row at phone width: name and supporting line on the left,
    // the control on the right, one hairline under the row.
    field: {
      alignItems: 'center',
      borderBottomColor: theme.colors.borderHairline,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: theme.spacing.md,
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    fieldStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
    fieldTextStacked: { flex: 0 },
    selectStacked: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 44, paddingVertical: 6 },
    fieldText: { flex: 1, gap: theme.spacing.xs, minWidth: 0 },
    fieldLabel: { color: theme.colors.ink, flexShrink: 0, fontSize: 14, lineHeight: 22 },
    fieldValue: { color: theme.colors.inkMuted, flexShrink: 1, fontSize: 14, lineHeight: 22, textAlign: 'right' },
    fieldDescription: { color: theme.colors.inkTertiary, fontSize: 12, lineHeight: 18 },
    // `CurrentVersionRow.module.css .row`: 16px 0 on the primary label at 14/22.
    versionRow: { color: theme.colors.ink, fontSize: 14, lineHeight: 22, paddingVertical: 16 },
    // `AppearanceRow.module.css .group`: title, then the cube row 8 below it,
    // 16/0 padding and one hairline under both.
    appearanceGroup: {
      borderBottomColor: theme.colors.borderHairline,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: theme.spacing.sm,
      paddingVertical: 16,
    },
    // `themeCube` at phone width: 12px 6px, so the cube stands 58 tall.
    appearanceCardDisabled: { opacity: 0.5 },
    appearanceCards: { flexDirection: 'row', gap: 8 },
    appearanceCard: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      flex: 1,
      gap: 4,
      justifyContent: 'center',
      minHeight: 58,
      paddingHorizontal: 6,
      paddingVertical: 12,
    },
    appearanceCardSelected: { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.borderStrong },
    appearanceLabel: { textAlign: 'center', flexShrink: 1, color: theme.colors.ink, fontSize: 14, lineHeight: 22 },
    // `Jz5dnG_selector`: 36 tall, radius 12, `bg-overlay` fill, 0 14px, gap 12.
    select: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.md,
      flexDirection: 'row',
      flexShrink: 0,
      gap: 12,
      maxWidth: '55%',
      minHeight: 36,
      paddingHorizontal: 14,
    },
    selectDisabled: { opacity: 0.6 },
    selectText: { color: theme.colors.ink, flexShrink: 1, fontSize: 14, fontWeight: '400', lineHeight: 22 },
    actionButton: { marginTop: 10, width: '100%' },
    muted: { color: theme.colors.inkTertiary, fontSize: 13 },
    warning: { color: theme.colors.warningText, fontSize: 12 },
    notice: {
      backgroundColor: theme.colors.warningSoft,
      borderColor: theme.colors.warning,
      borderRadius: 9,
      borderWidth: StyleSheet.hairlineWidth,
      color: theme.colors.warningText,
      lineHeight: 20,
      padding: 11,
    },
    code: {
      backgroundColor: theme.colors.codeBackground,
      borderRadius: 10,
      color: theme.colors.codeForeground,
      fontFamily: MONOSPACE_FONT,
      fontSize: 12,
      lineHeight: 18,
      padding: 12,
    },
    center: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 24 },
    error: { color: theme.colors.danger, lineHeight: 20 },
    queryError: {
      alignItems: 'flex-start',
      backgroundColor: theme.colors.dangerSoft,
      borderColor: theme.colors.dangerBorder,
      borderRadius: 9,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      padding: 11,
    },
    queryErrorBody: { flex: 1, gap: 8 },
    pressed: { opacity: 0.62 },
  })
