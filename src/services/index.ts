import { authRepository } from '../data/auth'
import { AuthService } from './auth-service'

// App-wide service singletons, wired to the active repositories.
export const authService = new AuthService(authRepository)
