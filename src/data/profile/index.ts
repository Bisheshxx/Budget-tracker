import { SupabaseProfileRepository } from './supabase-profile-repository'
import type { IProfileRepository } from './IProfileRepository'

// THE swap point for profile data. Replace this one construction to move to an
// axios/REST backend later; nothing else references the concrete implementation.
// See docs/adr/0001-client-side-swappable-repositories.md.
export const profileRepository: IProfileRepository =
  new SupabaseProfileRepository()
