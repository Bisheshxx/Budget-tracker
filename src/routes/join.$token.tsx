import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '#/features/auth/contexts/auth-context'
import { useProfile } from '#/shared/hooks/use-profile'
import { JoinHousehold } from '#/features/households/components/JoinHousehold'
import {
  clearPendingInvite,
  writePendingInvite,
} from '#/features/households/utils/invite.util'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

// Where an invite link lands. Deliberately outside `_authed`: a visitor who is
// signed out (or has not finished Onboarding) must not lose the link, so the
// token is parked on this device and `_authed` brings them back here once they
// are in. See docs/adr/0012.
export const Route = createFileRoute('/join/$token')({
  component: JoinPage,
})

function JoinPage() {
  const { token } = Route.useParams()
  const { session, loading: authLoading } = useAuth()
  const { isOnboarded, loading: profileLoading } = useProfile()
  const navigate = useNavigate()
  const loading = authLoading || profileLoading
  const signedIn = !!session
  const ready = signedIn && isOnboarded

  useEffect(() => {
    if (loading) return
    if (ready) {
      clearPendingInvite()
      return
    }
    writePendingInvite(token)
    if (signedIn) navigate({ to: '/onboarding', replace: true })
  }, [loading, ready, signedIn, token, navigate])

  if (loading || (signedIn && !isOnboarded)) return null

  const toDashboard = () => navigate({ to: '/dashboard' })

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-4 py-10">
      {ready ? (
        <JoinHousehold
          token={token}
          onJoined={toDashboard}
          onDismiss={toDashboard}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;ve been invited to a group</CardTitle>
            <CardDescription>
              Log in or create an account to see the invite. We&apos;ll bring
              you straight back here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/signup">Sign up</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
