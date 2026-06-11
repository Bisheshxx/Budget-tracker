import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../lib/auth-context'
import { Button } from '../../components/ui/button'

// Empty protected shell. Real cashflow content lands in issue 05.
export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  async function onSignOut() {
    await signOut()
    await navigate({ to: '/login', replace: true })
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button variant="outline" onClick={onSignOut}>
          Log out
        </Button>
      </div>
      <p className="mt-4 text-muted-foreground">
        You're signed in as {session?.user.email ?? 'your account'}. Cashflow
        content arrives in a later slice.
      </p>
    </main>
  )
}
