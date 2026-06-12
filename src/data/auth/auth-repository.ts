// Source-agnostic auth contract. Today it's backed by Supabase; tomorrow it can
// be an axios/REST backend. Components and services depend on THIS, never on
// supabase-js directly. See docs/adr/0001-client-side-swappable-repositories.md.

export interface AuthUser {
  id: string
  email: string | null
}

export interface AuthSession {
  user: AuthUser
}

export interface Credentials {
  email: string
  password: string
}

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
