import { authRepository } from '../data/auth'
import { profileRepository } from '../data/profile'
import { AuthService } from './auth-service'
import { ProfileService } from './profile-service'

// App-wide service singletons, wired to the active repositories.
export const authService = new AuthService(authRepository)
export const profileService = new ProfileService(profileRepository)
