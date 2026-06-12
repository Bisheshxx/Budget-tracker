import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import { useProfile } from '../lib/profile-query'

// Pathless protected layout. Any route nested under `_authed` requires a
// session AND a completed Onboarding. The guard runs client-side (SSR deferred
// per ADR 0001): while auth/profile resolve we render nothing; unauthenticated
// users go to /login and authenticated-but-unconfigured users go to /onboarding.
// RLS remains the server-side backstop, not the source of truth here.
export const Route = createFileRoute('/_authed')({
  component: AuthedLayout,
})

function AuthedLayout() {
  const { session, loading: authLoading } = useAuth()
  const { isOnboarded, loading: profileLoading } = useProfile()
  const navigate = useNavigate()
  const loading = authLoading || profileLoading

  useEffect(() => {
    if (loading) return
    if (!session) {
      navigate({ to: '/login', replace: true })
    } else if (!isOnboarded) {
      navigate({ to: '/onboarding', replace: true })
    }
  }, [loading, session, isOnboarded, navigate])

  if (loading || !session || !isOnboarded) return null

  return <Outlet />
}
