import {
  useAcceptInvite,
  useInvitePreview,
} from '#/features/households/hooks/use-household-invites'
import { getErrorMessage } from '#/lib/errors'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

// The join screen behind an invite link: says which group the link is for and
// who sent it, and joins only when the user says so. Joining never merges
// anything — the user's Personal household stays as it is.
export function JoinHousehold({
  token,
  onJoined,
  onDismiss,
}: {
  token: string
  /** Called once the user is a member and the group is active. */
  onJoined: () => void
  /** Called when the user backs out, or the link turns out to be dead. */
  onDismiss: () => void
}) {
  const preview = useInvitePreview(token)
  const accept = useAcceptInvite()

  async function join() {
    try {
      await accept.mutateAsync(token)
      onJoined()
    } catch {
      // Shown below from the mutation's error state.
    }
  }

  if (preview.isLoading) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
      </Card>
    )
  }

  if (preview.isError || !preview.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This invite can&apos;t be used</CardTitle>
          <CardDescription>
            It may have expired, been revoked, or already been used. Ask for a
            new link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onDismiss}>
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { householdName, invitedBy } = preview.data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join {householdName}?</CardTitle>
        <CardDescription>
          {invitedBy
            ? `${invitedBy} invited you to this group.`
            : 'You have been invited to this group.'}{' '}
          Everyone in it sees and adds to the same income and expenses. Your
          personal entries stay separate and are not shared.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {accept.isError && (
          <p className="text-sm text-destructive">
            {getErrorMessage(accept.error, 'Could not join the group')}
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={join} disabled={accept.isPending}>
            {accept.isPending ? 'Joining…' : 'Join group'}
          </Button>
          <Button
            variant="outline"
            onClick={onDismiss}
            disabled={accept.isPending}
          >
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
