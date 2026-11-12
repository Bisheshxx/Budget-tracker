import { profileRepository } from '#/data/profile'
import { ProfileService } from './profile-service'

// Composition root for the profile feature: the app-wide ProfileService
// singleton, wired to the active repository.
// The backend behind it is chosen in src/data/index.ts (docs/adr/0011) —
// nothing here changes on a swap.
export const profileService = new ProfileService(profileRepository)
