import { SupabaseAuthRepository } from './supabase-auth-repository'
import type { IAuthRepository } from './auth-repository'

// THE swap point for auth. Replace this one construction to move auth to an
// axios/REST backend later. Nothing else in the app references the concrete
// implementation. See docs/adr/0001-client-side-swappable-repositories.md.
export const authRepository: IAuthRepository = new SupabaseAuthRepository()
