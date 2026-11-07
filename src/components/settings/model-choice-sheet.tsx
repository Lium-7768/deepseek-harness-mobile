import { NativeAnchoredPanel } from '@/components/native-anchored-panel'
import { NativeModelDirectory } from '@/components/native-model-directory'
import type { MobileModelProviderGroup } from '@/types/mobile'

/**
 * Bottom sheet holding the searchable model directory.
 *
 * The settings page names one default model; the catalog can run to dozens of
 * routings per provider, and a phone page that lists them all buries the one
 * choice it offers. The sheet reuses the composer's directory — same search,
 * same grouping — so both entry points behave identically.
 *
 * @param props - Whether the sheet is open, the catalog, the current choice, and the pick handler.
 * @returns The sheet, or `null` while closed.
 */
export function ModelChoiceSheet({
  groups,
  loading,
  onClose,
  onSelect,
  open,
  selection,
  submitting,
}: {
  groups: MobileModelProviderGroup[]
  loading: boolean
  onClose: () => void
  onSelect: (choice: { provider: string; model: string }) => void
  open: boolean
  selection?: { provider: string; model: string }
  /** The key awaiting the Host's acknowledgement, or undefined. */
  submitting?: string
}): React.JSX.Element | null {
  return (
    <NativeAnchoredPanel onClose={onClose} open={open}>
      <NativeModelDirectory
        disabled={submitting !== undefined}
        groups={groups}
        loading={loading}
        onBack={onClose}
        onSelect={(choice) => {
          onSelect(choice)
          onClose()
        }}
        selection={selection}
        showDetail={false}
        status={null}
      />
    </NativeAnchoredPanel>
  )
}
