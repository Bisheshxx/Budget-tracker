import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '#/features/auth'
import type { ReactNode } from 'react'
import type { AuthSession, Credentials } from '#/features/auth/types'

interface AuthContextValue {
  session: AuthSession | null
  /** True until the initial session has been resolved. */
  loading: boolean
  signUp: (credentials: Credentials) => Promise<AuthSession | null>
  signIn: (credentials: Credentials) => Promise<AuthSession>
  /** Kick off the Google OAuth redirect, returning to /auth/callback. */
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    authService
      .getSession()
      .then((s) => {
        if (active) setSession(s)
      })
      .catch((err) => {
        console.error('Failed to resolve initial session', err)
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const unsubscribe = authService.onAuthStateChange((s) => {
      if (active) setSession(s)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signUp: (c) => authService.signUp(c),
      signIn: (c) => authService.signIn(c),
      signInWithGoogle: () =>
        authService.signInWithOAuth(
          'google',
          `${window.location.origin}/auth/callback`,
        ),
      signOut: () => authService.signOut(),
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
