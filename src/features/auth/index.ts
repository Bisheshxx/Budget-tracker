import { authRepository } from '#/data/auth'
import { AuthService } from './auth-service'

// Composition root for the auth feature: the app-wide AuthService singleton,
// wired to the active repository. Swap the repository in #/data/auth to move
// off Supabase — nothing here changes. See docs/adr/0001 and docs/adr/0002.
export const authService = new AuthService(authRepository)
