import type { AuthSession, Credentials } from '#/features/auth/types'

// The auth persistence port. Today it's implemented by Supabase
// (supabase-auth-repository.ts); tomorrow it can be an axios/REST backend —
// swap the impl in index.ts. Services depend on THIS, never on supabase-js
// directly. It speaks the auth feature's domain types. See docs/adr/0001 and
// docs/adr/0004.
export interface IAuthRepository {
  signUp: (credentials: Credentials) => Promise<AuthSession | null>
  signIn: (credentials: Credentials) => Promise<AuthSession>
  /**
   * Start an OAuth flow. Triggers a full-page redirect to the provider; the
   * promise resolves once the redirect has been kicked off, not on return.
   */
  signInWithOAuth: (provider: 'google', redirectTo: string) => Promise<void>
  signOut: () => Promise<void>
  getSession: () => Promise<AuthSession | null>
  /** Subscribe to session changes. Returns an unsubscribe function. */
  onAuthStateChange: (callback: (session: AuthSession | null) => void) => () => void
}
