import type { MobileModelProviderGroup, MobileModelSelection, MobilePermissionSelect } from '@/types/mobile'

/** Only a published, different permission can be committed; full access requires a separate confirmation. */
export function permissionSelectionDecision(
  value: string,
  permissions: MobilePermissionSelect | undefined,
  locked: boolean,
): 'ignore' | 'confirm' | 'submit' {
  if (
    locked ||
    !permissions ||
    value === permissions.currentValue ||
    value === 'custom' ||
    !permissions.options.some((option) => option.value === value)
  )
    return 'ignore'
  return value === 'danger-full-access' ? 'confirm' : 'submit'
}

/** Match the complete route identity: model ids are only unique within a provider. */
export function selectedCatalogModel(
  groups: readonly MobileModelProviderGroup[],
  selection: Pick<MobileModelSelection, 'provider' | 'model'> | undefined,
) {
  return groups.find((group) => group.id === selection?.provider)?.models.find((model) => model.id === selection?.model)
}

export function splitModelId(id: string): { leaf: string; prefix: string | undefined } {
  const segments = id.split('/').filter(Boolean)
  const leaf = segments.at(-1) ?? id
  return { leaf, prefix: segments.length > 1 ? segments.slice(0, -1).join('/') : undefined }
}

export function catalogModelLabel(
  groups: readonly MobileModelProviderGroup[],
  selection: MobileModelSelection,
): string {
  const entry = selectedCatalogModel(groups, selection)
  return entry && entry.name !== entry.id ? entry.name : splitModelId(selection.model).leaf
}

/** Same-render serialization; React pending state alone cannot close the rapid-tap window. */
export function createSelectionGate() {
  let busy = false
  return {
    get busy() {
      return busy
    },
    async run(action: () => Promise<unknown>): Promise<void> {
      if (busy) return
      busy = true
      try {
        await action()
      } finally {
        busy = false
      }
    },
  }
}
