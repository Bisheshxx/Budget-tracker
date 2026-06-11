import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

// Mock the supabase client module so the repository never touches real env
// vars or the network. vi.hoisted keeps `auth` available inside the hoisted
// vi.mock factory.
const { auth } = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}))

vi.mock('#/lib/supabase.ts', () => ({ supabase: { auth } }))

const { SupabaseAuthRepository } = await import(
  '#/data/auth/supabase-auth-repository.ts'
)

// Minimal Supabase session — only the fields toAuthSession reads.
function fakeSession(
  user: { id: string; email?: string | null } = { id: 'u1', email: 'a@b.com' },
): Session {
  return { user } as unknown as Session
}

const creds = { email: 'a@b.com', password: 'secret123' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SupabaseAuthRepository', () => {
  describe('signUp', () => {
    it('maps the returned session to an AuthSession', async () => {
      auth.signUp.mockResolvedValue({
        data: { session: fakeSession() },
        error: null,
      })
      const repo = new SupabaseAuthRepository()

      await expect(repo.signUp(creds)).resolves.toEqual({
        user: { id: 'u1', email: 'a@b.com' },
      })
      expect(auth.signUp).toHaveBeenCalledWith(creds)
    })

    it('returns null when no session (email confirmation pending)', async () => {
      auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
      const repo = new SupabaseAuthRepository()

      await expect(repo.signUp(creds)).resolves.toBeNull()
    })

    it('maps a missing email to null', async () => {
      auth.signUp.mockResolvedValue({
        data: { session: fakeSession({ id: 'u2', email: undefined }) },
        error: null,
      })
      const repo = new SupabaseAuthRepository()

      await expect(repo.signUp(creds)).resolves.toEqual({
        user: { id: 'u2', email: null },
      })
    })

    it('throws the Supabase error', async () => {
      auth.signUp.mockResolvedValue({
        data: { session: null },
        error: new Error('email already registered'),
      })
      const repo = new SupabaseAuthRepository()

      await expect(repo.signUp(creds)).rejects.toThrow(
        'email already registered',
      )
    })
  })

  describe('signIn', () => {
    it('maps the returned session to an AuthSession', async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { session: fakeSession() },
        error: null,
      })
      const repo = new SupabaseAuthRepository()

      await expect(repo.signIn(creds)).resolves.toEqual({
        user: { id: 'u1', email: 'a@b.com' },
      })
      expect(auth.signInWithPassword).toHaveBeenCalledWith(creds)
    })

    it('throws when sign in succeeds but no session is returned', async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: null,
      })
      const repo = new SupabaseAuthRepository()

      await expect(repo.signIn(creds)).rejects.toThrow(
        'Sign in succeeded but no session returned',
      )
    })

    it('throws the Supabase error', async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: new Error('invalid login credentials'),
      })
      const repo = new SupabaseAuthRepository()

      await expect(repo.signIn(creds)).rejects.toThrow(
        'invalid login credentials',
      )
    })
  })

  describe('signOut', () => {
    it('resolves when Supabase reports no error', async () => {
      auth.signOut.mockResolvedValue({ error: null })
      const repo = new SupabaseAuthRepository()

      await expect(repo.signOut()).resolves.toBeUndefined()
    })

    it('throws the Supabase error', async () => {
      auth.signOut.mockResolvedValue({ error: new Error('signout failed') })
      const repo = new SupabaseAuthRepository()

      await expect(repo.signOut()).rejects.toThrow('signout failed')
    })
  })

  describe('getSession', () => {
    it('maps the current session', async () => {
      auth.getSession.mockResolvedValue({
        data: { session: fakeSession() },
        error: null,
      })
      const repo = new SupabaseAuthRepository()

      await expect(repo.getSession()).resolves.toEqual({
        user: { id: 'u1', email: 'a@b.com' },
      })
    })

    it('returns null when there is no session', async () => {
      auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })
      const repo = new SupabaseAuthRepository()

      await expect(repo.getSession()).resolves.toBeNull()
    })

    it('throws the Supabase error', async () => {
      auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('getSession failed'),
      })
      const repo = new SupabaseAuthRepository()

      await expect(repo.getSession()).rejects.toThrow('getSession failed')
    })
  })

  describe('onAuthStateChange', () => {
    it('forwards a mapped session to the callback and returns an unsubscribe fn', () => {
      const unsubscribe = vi.fn()
      let captured: ((event: string, session: Session | null) => void) | null =
        null
      auth.onAuthStateChange.mockImplementation((cb: typeof captured) => {
        captured = cb
        return { data: { subscription: { unsubscribe } } }
      })
      const repo = new SupabaseAuthRepository()

      const received: Array<unknown> = []
      const teardown = repo.onAuthStateChange((s) => received.push(s))

      // Simulate Supabase emitting a sign-in event.
      captured!('SIGNED_IN', fakeSession())
      expect(received).toEqual([{ user: { id: 'u1', email: 'a@b.com' } }])

      // Simulate a sign-out (null session).
      captured!('SIGNED_OUT', null)
      expect(received[1]).toBeNull()

      teardown()
      expect(unsubscribe).toHaveBeenCalledOnce()
    })
  })
})
