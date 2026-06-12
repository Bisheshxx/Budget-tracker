import { profileRepository } from '#/data/profile'
import { ProfileService } from './profile-service'

// Composition root for the profile feature: the app-wide ProfileService
// singleton, wired to the active repository. Swap the repository in
// #/data/profile to move off Supabase. See docs/adr/0001 and docs/adr/0002.
export const profileService = new ProfileService(profileRepository)
