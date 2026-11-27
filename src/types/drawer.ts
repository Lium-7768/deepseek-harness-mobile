/** The two session ordering modes supported by the drawer model. */
export type SessionOrder = 'manual' | 'updated'

export type DrawerGrouping = 'workspace' | 'workspace-tree' | 'flat'
export type ArchivedFilter = 'default' | 'show' | 'only'

export type DrawerViewPreferences = {
  groupBy: DrawerGrouping
  orderBy: SessionOrder
  archivedFilter: ArchivedFilter
  orders: Record<string, string[]>
}
