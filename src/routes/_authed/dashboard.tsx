import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '#/features/auth/auth-context'
import { Button } from '#/components/ui/button'

// Empty protected shell. Real cashflow content lands in issue 05.
export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  async function onSignOut() {
    if (signingOut) return
    setError(null)
    setSigningOut(true)
    try {
      await signOut()
      await navigate({ to: '/login', replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign out')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button variant="outline" onClick={onSignOut} disabled={signingOut}>
          {signingOut ? 'Logging out…' : 'Log out'}
        </Button>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <p className="mt-4 text-muted-foreground">
        You're signed in as {session?.user.email ?? 'your account'}. Cashflow
        content arrives in a later slice.
      </p>
    </main>
  )
}
