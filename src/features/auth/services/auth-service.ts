import { parseOrThrow } from '#/shared/utils/validation.util'
import { credentialsSchema } from '#/features/auth/schemas/auth.schema'
import type { AuthSession, Credentials } from '#/features/auth/types/auth.type'
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

  onAuthStateChange(
    callback: (session: AuthSession | null) => void,
  ): () => void {
    return this.repo.onAuthStateChange(callback)
  }

  private validate(credentials: Credentials): void {
    parseOrThrow(credentialsSchema, credentials)
  }
}
