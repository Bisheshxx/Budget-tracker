import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const session = await signUp({ email, password })
      if (session) {
        // No email confirmation required — straight into the app.
        await navigate({ to: '/dashboard' })
      } else {
        // Email confirmation enabled: session arrives after the user confirms.
        setNotice('Check your email to confirm your account, then log in.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign up')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Start staying on top of your cashflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Sign up'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
