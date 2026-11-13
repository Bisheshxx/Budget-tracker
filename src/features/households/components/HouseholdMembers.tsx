import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import {
  useHouseholdMembers,
  useMembershipMutations,
} from '#/features/households/hooks/use-household-members'
import type { HouseholdMember } from '#/features/households/types/household.type'
import type { Household } from '#/shared/types/household.type'
import { notifyError } from '#/lib/errors'
import { Dialog } from '#/shared/components/Dialog'
import { UserAvatar } from '#/shared/components/UserAvatar'
import { useDialog } from '#/shared/hooks/use-dialog'
import { DIALOG } from '#/shared/stores/ui-store'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

type PendingAction =
  | { kind: 'leave' }
  | { kind: 'remove'; member: HouseholdMember }
  | { kind: 'transfer'; member: HouseholdMember }

function nameOf(member: HouseholdMember): string {
  return member.displayName?.trim() || 'Unnamed member'
}

// What the confirmation says, per action. Leaving as the only member deletes
// the group, so that case spells out the consequence.
function confirmCopy(
  action: PendingAction,
  household: Household,
  isLastMember: boolean,
): { title: string; description: string; confirm: string } {
  if (action.kind === 'remove') {
    return {
      title: `Remove ${nameOf(action.member)}?`,
      description: `They lose access to ${household.name}. Entries they added stay in the group.`,
      confirm: 'Remove',
    }
  }
  if (action.kind === 'transfer') {
    return {
      title: `Make ${nameOf(action.member)} the admin?`,
      description:
        'A group has one admin. You become a contributor and can no longer change group settings or remove people.',
      confirm: 'Make admin',
    }
  }
  if (isLastMember) {
    return {
      title: `Delete ${household.name}?`,
      description:
        'You are the only member, so leaving deletes this group and every entry, category and recurring item in it. This cannot be undone.',
      confirm: 'Leave and delete group',
    }
  }
  return {
    title: `Leave ${household.name}?`,
    description:
      household.role === 'admin'
        ? 'Entries you added stay in the group. The longest-standing member becomes the admin.'
        : 'Entries you added stay in the group. You need a new invite to come back.',
    confirm: 'Leave group',
  }
}

// Who is in the group. The Admin can remove people or hand the role over;
// anyone can leave. Every change is confirmed first.
export function HouseholdMembers({
  household,
  profileId,
}: {
  household: Household
  profileId: string
}) {
  const members = useHouseholdMembers(household.id)
  const { remove, transferAdmin, leave } = useMembershipMutations(household.id)
  const confirm = useDialog(DIALOG.confirmHouseholdMemberAction)
  const [action, setAction] = useState<PendingAction | null>(null)

  const isAdmin = household.role === 'admin'
  const list = members.data ?? []
  const isLastMember = list.length <= 1
  const busy = remove.isPending || transferAdmin.isPending || leave.isPending

  function ask(next: PendingAction) {
    setAction(next)
    confirm.open()
  }

  async function run() {
    if (!action) return
    try {
      if (action.kind === 'remove') {
        await remove.mutateAsync(action.member.profileId)
        toast.success(`${nameOf(action.member)} removed`)
      } else if (action.kind === 'transfer') {
        await transferAdmin.mutateAsync(action.member.profileId)
        toast.success(`${nameOf(action.member)} is now the admin`)
      } else {
        await leave.mutateAsync(isLastMember)
        toast.success(
          isLastMember
            ? `${household.name} deleted`
            : `You left ${household.name}`,
        )
      }
      confirm.close()
    } catch (err) {
      notifyError(err, 'Could not update the group')
    }
  }

  const copy = action ? confirmCopy(action, household, isLastMember) : null

  return (
    <div className="flex flex-col gap-4">
      {members.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : members.isError ? (
        <p className="text-sm text-destructive">Could not load the members.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((member) => {
            const isMe = member.profileId === profileId
            return (
              <li key={member.profileId} className="flex items-center gap-3">
                <UserAvatar
                  name={member.displayName}
                  imageUrl={member.avatarUrl}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {nameOf(member)}
                  {isMe && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </span>
                {member.role === 'admin' && (
                  <Badge variant="secondary">Admin</Badge>
                )}
                {isAdmin && !isMe && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${nameOf(member)}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => ask({ kind: 'transfer', member })}
                      >
                        Make admin
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => ask({ kind: 'remove', member })}
                      >
                        Remove from group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Button
        variant="outline"
        className="self-start"
        disabled={members.isLoading || members.isError}
        onClick={() => ask({ kind: 'leave' })}
      >
        Leave group
      </Button>

      <Dialog
        name={DIALOG.confirmHouseholdMemberAction}
        title={copy?.title}
        description={copy?.description}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={confirm.close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={action?.kind === 'transfer' ? 'default' : 'destructive'}
            onClick={run}
            disabled={busy}
          >
            {busy ? 'Working…' : copy?.confirm}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
