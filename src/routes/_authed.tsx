import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '../lib/auth-context'

// Pathless protected layout. Any route nested under `_authed` requires a
// session. The guard runs client-side (SSR deferred per ADR 0001): while the
// session resolves we render nothing; unauthenticated users are redirected to
// /login. RLS remains the server-side backstop, not the source of truth here.
export const Route = createFileRoute('/_authed')({
  component: AuthedLayout,
})

function AuthedLayout() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: '/login', replace: true })
    }
  }, [loading, session, navigate])

  if (loading || !session) return null

  return <Outlet />
}
