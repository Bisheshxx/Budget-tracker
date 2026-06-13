import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '#/features/auth/auth-context'
import { useProfile } from '#/features/profile/use-profile'
import { OnboardingForm } from '#/features/profile/components/OnboardingForm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const { session, loading: authLoading } = useAuth()
  const { isOnboarded, loading: profileLoading } = useProfile()
  const navigate = useNavigate()
  const loading = authLoading || profileLoading

  // Gate: unauthenticated → login; already onboarded → dashboard.
  useEffect(() => {
    if (loading) return
    if (!session) {
      navigate({ to: '/login', replace: true })
    } else if (isOnboarded) {
      navigate({ to: '/dashboard', replace: true })
    }
  }, [loading, session, isOnboarded, navigate])

  // Avoid a flash of the form while we resolve auth/profile or redirect away.
  if (loading || !session || isOnboarded) return null

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Set up your space</CardTitle>
          <CardDescription>
            Two quick required fields and you're in. The rest is optional — you
            can change any of it later in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            onComplete={() => navigate({ to: '/dashboard', replace: true })}
          />
        </CardContent>
      </Card>
    </main>
  )
}
