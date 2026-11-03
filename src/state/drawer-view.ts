import type { DrawerViewPreferences } from '@/components/drawer-view-logic'
import * as FileSystem from 'expo-file-system/legacy'
import { create } from 'zustand'

type DrawerView = DrawerViewPreferences
const defaultView: DrawerView = { groupBy: 'workspace', orderBy: 'updated', archivedFilter: 'default', orders: {} }
const path = `${FileSystem.documentDirectory}drawer-view-v1.json`
let saving: Promise<unknown> = Promise.resolve()
let initializing: Promise<void> | undefined

/** Client-local preferences, like the desktop browser store; manual accounts are isolated per paired desktop. */
export const useDrawerViewStore = create<{
  views: Record<string, DrawerView>
  initialize(): Promise<void>
  update(scope: string, changes: Partial<DrawerView>): void
}>((set, get) => ({
  views: {},
  initialize() {
    return (initializing ??= (async () => {
      try {
        const encoded: unknown = JSON.parse(await FileSystem.readAsStringAsync(path))
        if (encoded === null || typeof encoded !== 'object' || Array.isArray(encoded)) return
        const views: Record<string, DrawerView> = {}
        for (const [scope, raw] of Object.entries(encoded)) {
          if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) continue
          const view = raw as Record<string, unknown>
          const orders: Record<string, string[]> = {}
          if (view.orders && typeof view.orders === 'object' && !Array.isArray(view.orders)) {
            for (const [key, ids] of Object.entries(view.orders))
              if (Array.isArray(ids) && ids.every((id) => typeof id === 'string')) orders[key] = ids
          }
          views[scope] = {
            groupBy: view.groupBy === 'flat' || view.groupBy === 'workspace-tree' ? view.groupBy : 'workspace',
            orderBy: view.orderBy === 'manual' ? 'manual' : 'updated',
            archivedFilter:
              view.archivedFilter === 'show' || view.archivedFilter === 'only' ? view.archivedFilter : 'default',
            orders,
          }
        }
        set((state) => ({ views: { ...views, ...state.views } }))
      } catch {
        /* Missing or invalid local preferences use the default view. */
      }
    })())
  },
  update(scope, changes) {
    set((state) => ({ views: { ...state.views, [scope]: { ...(state.views[scope] ?? defaultView), ...changes } } }))
    const initialized = get().initialize()
    saving = saving
      .catch(() => undefined)
      .then(() => initialized)
      .then(() => FileSystem.writeAsStringAsync(path, JSON.stringify(get().views)))
      .catch(() => undefined)
  },
}))

export const defaultDrawerView = defaultView
