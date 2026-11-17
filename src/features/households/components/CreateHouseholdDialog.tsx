import { Dialog } from '#/shared/components/Dialog'
import { useDialog } from '#/shared/hooks/use-dialog'
import { DIALOG } from '#/shared/stores/ui-store'
import { CreateHouseholdForm } from '#/features/households/components/CreateHouseholdForm'

// The "New group" dialog. Mounted once in the root layout so the header's
// HouseholdSwitcher can open it from any page.
export function CreateHouseholdDialog() {
  const { close } = useDialog(DIALOG.createHousehold)

  return (
    <Dialog
      name={DIALOG.createHousehold}
      title="New group"
      description="A group is a shared ledger: everyone in it sees and adds to the same income and expenses. Your personal entries stay separate."
    >
      <CreateHouseholdForm onCreated={close} />
    </Dialog>
  )
}
