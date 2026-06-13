import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '#/features/auth/auth-context'

// Landing route after the Google OAuth redirect. supabase-js parses the session
// from the URL (detectSessionInUrl: true), so we just wait for the auth context
// to resolve, then route on. Mirrors the client-side pattern in _authed.tsx.
export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
})

function AuthCallback() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (session) {
      navigate({ to: '/dashboard', replace: true })
    } else {
      navigate({ to: '/login', replace: true })
    }
  }, [loading, session, navigate])

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col items-center justify-center px-4 py-10">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </main>
  )
}
