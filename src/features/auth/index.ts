import { authRepository } from '#/data/auth'
import { AuthService } from '#/features/auth/services/auth-service'

// Composition root for the auth feature: the app-wide AuthService singleton,
// wired to the active repository.
// The backend behind it is chosen in src/data/index.ts (docs/adr/0011) —
// nothing here changes on a swap.
export const authService = new AuthService(authRepository)
