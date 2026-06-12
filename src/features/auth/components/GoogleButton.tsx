import { useState } from 'react'
import { useAuth } from '#/features/auth/auth-context'
import { Button } from '#/components/ui/button'

const googleIcon = '/icons/google.svg'

// "Continue with Google" trigger shared by the login and signup screens. The
// click starts a full-page OAuth redirect; on failure we keep the user here and
// show why.
export function GoogleButton() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onClick() {
    setError(null)
    setPending(true)
    try {
      await signInWithGoogle()
      // On success the browser navigates away; nothing more to do here.
    } catch (err) {
      setPending(false)
      setError(
        err instanceof Error ? err.message : 'Could not continue with Google',
      )
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onClick}
        disabled={pending}
      >
        <img className={'size-4'} src={googleIcon} alt="" aria-hidden="true" />
        {pending ? 'Redirecting…' : 'Continue with Google'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
