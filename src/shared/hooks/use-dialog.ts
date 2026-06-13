import { useUiStore } from '#/shared/stores/ui-store'
import type { DialogName } from '#/shared/stores/ui-store'

// Connector between a dialog name and the global UI store. Confines the store
// coupling to one place so the dialog component stays thin. The `isOpen` selector
// compares against this name only, so a component using it re-renders just when
// its own open-state flips — not on every dialog change.
export function useDialog(name: DialogName) {
  const isOpen = useUiStore((s) => s.activeDialog === name)
  const openDialog = useUiStore((s) => s.openDialog)
  const closeDialog = useUiStore((s) => s.closeDialog)

  return {
    isOpen,
    open: () => openDialog(name),
    close: closeDialog,
  }
}
