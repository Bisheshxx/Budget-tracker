import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useHouseholdInvites } from '#/features/households/hooks/use-household-invites'
import {
  formatMomentDate,
  inviteUrl,
} from '#/features/households/utils/invite.util'
import type { CreatedInvite } from '#/features/households/types/household.type'
import { notifyError } from '#/lib/errors'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

// Invite links for a group. A link works once and expires after a week; only
// its hash is stored, so the link is shown at creation and never again — the
// list below can only say that an unused link exists, and revoke it.
export function HouseholdInvites({ householdId }: { householdId: string }) {
  const { pending, create, revoke } = useHouseholdInvites(householdId)
  const [created, setCreated] = useState<CreatedInvite | null>(null)

  const link = created ? inviteUrl(window.location.origin, created.token) : ''

  async function createLink() {
    try {
      setCreated(await create.mutateAsync())
    } catch (err) {
      notifyError(err, 'Could not create an invite link')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy. Select the link and copy it yourself.')
    }
  }

  async function revokeInvite(inviteId: string) {
    try {
      await revoke.mutateAsync(inviteId)
      if (created?.id === inviteId) setCreated(null)
      toast.success('Invite revoked')
    } catch (err) {
      notifyError(err, 'Could not revoke the invite')
    }
  }

  const invites = pending.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Anyone who opens an invite link can join as a contributor. Each link
        works once and expires after 7 days.
      </p>

      {created && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-link">New invite link</Label>
          <div className="flex gap-2">
            <Input
              id="invite-link"
              readOnly
              value={link}
              onFocus={(event) => event.target.select()}
            />
            <Button variant="outline" onClick={copyLink}>
              <Copy />
              Copy
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Copy it now. For safety it is not shown again.
          </p>
        </div>
      )}

      <Button
        className="self-start"
        onClick={createLink}
        disabled={create.isPending}
      >
        {create.isPending ? 'Creating…' : 'Create invite link'}
      </Button>

      {pending.isError && (
        <p className="text-sm text-destructive">Could not load the invites.</p>
      )}

      {invites.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Unused links</h3>
          <ul className="flex flex-col gap-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-muted-foreground">
                  Created {formatMomentDate(invite.createdAt)}, expires{' '}
                  {formatMomentDate(invite.expiresAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoke.isPending}
                  onClick={() => revokeInvite(invite.id)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
