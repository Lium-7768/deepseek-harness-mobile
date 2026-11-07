import { NativeIcon, type NativeIconName } from '@/components/native-icon'
import { drawerMenuGeometry, type ArchivedFilter, type DrawerGrouping } from '@/components/drawer-view-logic'
import type { SessionOrder } from '@/components/session-drawer-logic'
import { t as message } from '@/locale'
import type { AppTheme } from '@/theme'
import { useThemedStyles, useAppTheme } from '@/theme/hooks'
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useEffect } from 'react'

type Props = {
  anchorBottom: number
  frameHeight: number
  groupBy: DrawerGrouping
  orderBy: SessionOrder
  archivedFilter: ArchivedFilter
  onClose(): void
  onGroupPick(value: DrawerGrouping): void
  onOrderPick(value: SessionOrder): void
  onFilterPick(value: ArchivedFilter): void
}

/** Desktop ViewOptionsMenu: one anchored card, three sections, and no extra close toolbar. */
export function DrawerViewMenu(props: Props): React.JSX.Element {
  const s = useThemedStyles(makeStyles)
  const theme = useAppTheme()
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      props.onClose()
      return true
    })
    return () => subscription.remove()
  }, [props.onClose])
  const groups: {
    title: string
    options: { label: string; icon: NativeIconName; selected: boolean; pick(): void }[]
  }[] = [
    {
      title: message('drawer.groupBy'),
      options: [
        {
          label: message('drawer.groupByWorkspace'),
          icon: 'folder-close',
          selected: props.groupBy === 'workspace',
          pick: () => props.onGroupPick('workspace'),
        },
        {
          label: message('drawer.groupByWorkspaceTree'),
          icon: 'workspace-tree-outline',
          selected: props.groupBy === 'workspace-tree',
          pick: () => props.onGroupPick('workspace-tree'),
        },
        {
          label: message('drawer.singleList'),
          icon: 'flat-list-outline',
          selected: props.groupBy === 'flat',
          pick: () => props.onGroupPick('flat'),
        },
      ],
    },
    {
      title: message('drawer.sortBy'),
      options: [
        {
          label: message('drawer.manualOrder'),
          icon: 'chevrons-up-down-outline',
          selected: props.orderBy === 'manual',
          pick: () => props.onOrderPick('manual'),
        },
        {
          label: message('drawer.recentlyUpdated'),
          icon: 'clock-outline',
          selected: props.orderBy === 'updated',
          pick: () => props.onOrderPick('updated'),
        },
      ],
    },
    {
      title: message('drawer.filterSessions'),
      options: [
        {
          label: message('drawer.hideArchived'),
          icon: 'archive-off-outline',
          selected: props.archivedFilter === 'default',
          pick: () => props.onFilterPick('default'),
        },
        {
          label: message('drawer.showArchived'),
          icon: 'queue-outline',
          selected: props.archivedFilter === 'show',
          pick: () => props.onFilterPick('show'),
        },
        {
          label: message('drawer.onlyArchived'),
          icon: 'archive-check-outline',
          selected: props.archivedFilter === 'only',
          pick: () => props.onFilterPick('only'),
        },
      ],
    },
  ]
  return (
    <View style={s.overlay}>
      <Pressable accessible={false} onPress={props.onClose} style={StyleSheet.absoluteFill} />
      <View
        accessibilityViewIsModal
        onAccessibilityEscape={props.onClose}
        style={[s.card, drawerMenuGeometry(props.frameHeight, props.anchorBottom)]}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          {groups.map((group, index) => (
            <View key={group.title}>
              {index > 0 ? <View style={s.separator} /> : null}
              <Text style={s.title}>{group.title}</Text>
              {group.options.map((option) => (
                <Pressable
                  android_ripple={{ borderless: false }}
                  key={option.label}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: option.selected }}
                  onPress={() => {
                    option.pick()
                    props.onClose()
                  }}
                  style={({ pressed }) => [s.row, pressed && s.pressed]}
                >
                  <NativeIcon name={option.icon} size={16} color={theme.colors.ink} />
                  <Text style={s.label}>{option.label}</Text>
                  <View style={s.check}>
                    {option.selected ? <NativeIcon name="check-outline" size={16} color={theme.colors.ink} /> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 100, elevation: 20 },
    card: {
      position: 'absolute',
      right: 8,
      width: '92%',
      maxWidth: 280,
      ...theme.elevation.sheet,
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderHairline,
    },
    content: { padding: 6 },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginHorizontal: 8,
      marginVertical: 6,
    },
    title: {
      color: theme.colors.inkTertiary,
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: 8,
      paddingTop: 4,
      paddingBottom: 2,
    },
    row: {
      minHeight: 44,
      paddingHorizontal: 8,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: theme.radius.control,
    },
    label: { color: theme.colors.ink, fontSize: 14, lineHeight: 22, flex: 1 },
    check: { width: 16 },
    pressed: { backgroundColor: theme.colors.interactiveHover },
  })
