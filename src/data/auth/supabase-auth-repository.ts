import { supabase } from '../../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { AuthSession, Credentials } from '#/features/auth/types'
import type { IAuthRepository } from './IAuthRepository'

/**
 * Convert a Supabase `Session` into the application's `AuthSession` shape.
 *
 * @param session - The Supabase session to convert, or `null`.
 * @returns The mapped `AuthSession` with `user.id` and `user.email` (email set to `null` if absent), or `null` if `session` is `null`.
 */
function toAuthSession(session: Session | null): AuthSession | null {
  if (!session) return null
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
    },
  }
}

export class SupabaseAuthRepository implements IAuthRepository {
  async signUp(credentials: Credentials): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.signUp(credentials)
    if (error) throw error
    // With email confirmation enabled, session is null until the user confirms.
    return toAuthSession(data.session)
  }

  async signIn(credentials: Credentials): Promise<AuthSession> {
    const { data, error } =
      await supabase.auth.signInWithPassword(credentials)
    if (error) throw error
    const session = toAuthSession(data.session)
    if (!session) throw new Error('Sign in succeeded but no session returned')
    return session
  }

  async signInWithOAuth(
    provider: 'google',
    redirectTo: string,
  ): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) throw error
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return toAuthSession(data.session)
  }

  onAuthStateChange(
    callback: (session: AuthSession | null) => void,
  ): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(toAuthSession(session))
    })
    return () => data.subscription.unsubscribe()
  }
}
