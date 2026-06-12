import type { ProfileUpdate, UserProfile } from '#/features/profile/types'

// The profile persistence port. Backed by Supabase today
// (supabase-profile-repository.ts); swappable for an axios/REST backend later —
// swap the impl in index.ts. Services depend on THIS, never on supabase-js
// directly. It speaks the profile feature's domain types. See docs/adr/0001 and
// docs/adr/0004.
export interface IProfileRepository {
  /** The current user's profile, or null if none exists yet. */
  getByAuthUserId: (authUserId: string) => Promise<UserProfile | null>
  /** Patch the profile and return the saved row. */
  update: (authUserId: string, patch: ProfileUpdate) => Promise<UserProfile>
}
