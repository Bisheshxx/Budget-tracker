import { credentialsSchema } from './schema'
import type { AuthSession, Credentials } from '#/features/auth/types'
import type { IAuthRepository } from '#/data/auth/IAuthRepository'

// Thin service over the auth repository. Holds app-level auth rules (e.g. input
// validation) so UI components stay declarative. Inject a fake IAuthRepository
// in tests — no Supabase, no RLS. See docs/adr/0001.
export class AuthService {
  constructor(private readonly repo: IAuthRepository) {}

  async signUp(credentials: Credentials): Promise<AuthSession | null> {
    this.validate(credentials)
    return this.repo.signUp(credentials)
  }

  async signIn(credentials: Credentials): Promise<AuthSession> {
    this.validate(credentials)
    return this.repo.signIn(credentials)
  }

  signInWithOAuth(provider: 'google', redirectTo: string): Promise<void> {
    return this.repo.signInWithOAuth(provider, redirectTo)
  }

  signOut(): Promise<void> {
    return this.repo.signOut()
  }

  getSession(): Promise<AuthSession | null> {
    return this.repo.getSession()
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    return this.repo.onAuthStateChange(callback)
  }

  private validate(credentials: Credentials): void {
    const result = credentialsSchema.safeParse(credentials)
    if (!result.success) {
      // Surface the first issue as a plain Error so callers (UI catch blocks,
      // tests) get a friendly message rather than a raw ZodError.
      throw new Error(result.error.issues[0].message)
    }
  }
}
