import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services'
import type { ReactNode } from 'react'
import type { AuthSession, Credentials } from '../data/auth/auth-repository'

interface AuthContextValue {
  session: AuthSession | null
  /** True until the initial session has been resolved. */
  loading: boolean
  signUp: (credentials: Credentials) => Promise<AuthSession | null>
  signIn: (credentials: Credentials) => Promise<AuthSession>
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
