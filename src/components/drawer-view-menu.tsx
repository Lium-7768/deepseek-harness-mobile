import { NativeMenuPanel } from '@/components/native-menu-panel'
import type { ArchivedFilter, DrawerGrouping } from '@/components/drawer-view-logic'
import type { SessionOrder } from '@/components/session-drawer-logic'
import { t as message } from '@/locale'

/**
 * Renders the drawer's view options as a bottom sheet.
 *
 * The desktop anchors this menu to its trigger button; on a phone the anchored
 * card had to measure the available height, then scroll its own eight radio rows
 * inside whatever that left. The shared sheet states the three groups and their
 * choices at full width, and the list behind it stays visible.
 *
 * @param props - The three current values and the picks they accept.
 * @returns The sheet.
 */
export function DrawerViewMenu({
  archivedFilter,
  groupBy,
  onClose,
  onFilterPick,
  onGroupPick,
  onOrderPick,
  orderBy,
}: {
  archivedFilter: ArchivedFilter
  groupBy: DrawerGrouping
  onClose(): void
  onFilterPick(value: ArchivedFilter): void
  onGroupPick(value: DrawerGrouping): void
  onOrderPick(value: SessionOrder): void
  orderBy: SessionOrder
}): React.JSX.Element {
  return (
    <NativeMenuPanel
      groups={[
        {
          options: [
            { label: message('drawer.groupByWorkspace'), selected: groupBy === 'workspace', value: 'group:workspace' },
            {
              label: message('drawer.groupByWorkspaceTree'),
              selected: groupBy === 'workspace-tree',
              value: 'group:workspace-tree',
            },
            { label: message('drawer.singleList'), selected: groupBy === 'flat', value: 'group:flat' },
          ],
          title: message('drawer.groupBy'),
        },
        {
          options: [
            { label: message('drawer.manualOrder'), selected: orderBy === 'manual', value: 'order:manual' },
            { label: message('drawer.recentlyUpdated'), selected: orderBy === 'updated', value: 'order:updated' },
          ],
          title: message('drawer.sortBy'),
        },
        {
          options: [
            { label: message('drawer.hideArchived'), selected: archivedFilter === 'default', value: 'filter:default' },
            { label: message('drawer.showArchived'), selected: archivedFilter === 'show', value: 'filter:show' },
            { label: message('drawer.onlyArchived'), selected: archivedFilter === 'only', value: 'filter:only' },
          ],
          title: message('drawer.filterSessions'),
        },
      ]}
      onClose={onClose}
      onSelect={(value) => {
        const [section, choice] = value.split(':')
        if (choice === undefined) return
        if (section === 'group') onGroupPick(choice as DrawerGrouping)
        else if (section === 'order') onOrderPick(choice as SessionOrder)
        else onFilterPick(choice as ArchivedFilter)
        onClose()
      }}
      open
      rowRole="select"
      title={message('drawer.viewSettings')}
    />
  )
}
