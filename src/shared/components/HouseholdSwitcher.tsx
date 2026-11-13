import { ChevronsUpDown, Plus, User, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { useHouseholds } from '#/shared/hooks/use-households'
import { useDialog } from '#/shared/hooks/use-dialog'
import { DIALOG } from '#/shared/stores/ui-store'

// Header control showing the active Household ("group" in the UI) and letting
// the user switch between the ones they belong to or start a new group. Renders
// nothing until the list has loaded, so the header never flashes a wrong name.
// The "New group" dialog itself is mounted in the root layout.
export function HouseholdSwitcher({
  align = 'end',
}: {
  /** Which edge of the button the menu lines up with. */
  align?: 'start' | 'end'
}) {
  const { households, active, setActive } = useHouseholds()
  const { open: openCreate } = useDialog(DIALOG.createHousehold)

  if (!active) return null

  const ActiveIcon = active.isPersonal ? User : Users

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Switch group, current: ${active.name}`}
        className="flex h-9 max-w-44 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ActiveIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{active.name}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          Groups
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={active.id} onValueChange={setActive}>
          {households.map((household) => (
            <DropdownMenuRadioItem key={household.id} value={household.id}>
              <span className="truncate">{household.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={openCreate}>
          <Plus />
          New group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
