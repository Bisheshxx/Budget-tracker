import type {
  AuthSession,
  Credentials,
  IAuthRepository,
} from '../data/auth/auth-repository'

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

  signOut(): Promise<void> {
    return this.repo.signOut()
  }

  getSession(): Promise<AuthSession | null> {
    return this.repo.getSession()
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    return this.repo.onAuthStateChange(callback)
  }

  private validate({ email, password }: Credentials): void {
    if (!email.includes('@')) throw new Error('Enter a valid email address')
    if (password.length < 6)
      throw new Error('Password must be at least 6 characters')
  }
}
