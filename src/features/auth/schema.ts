import { z } from 'zod'

// Single source of truth for credential validation. Used by the auth forms
// (via @hookform/resolvers' zodResolver) AND by AuthService as a server-side
// backstop, so the rules can never drift between UI and service.
export const credentialsSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type CredentialsInput = z.infer<typeof credentialsSchema>
