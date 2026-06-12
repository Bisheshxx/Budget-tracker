import { describe, expect, it, vi } from 'vitest'
import { AuthService } from '#/features/auth/auth-service.ts'
import type {
  AuthSession,
  Credentials,
  IAuthRepository,
} from '#/data/auth/auth-repository.ts'

const session: AuthSession = {
  user: { id: 'user-1', email: 'a@b.com' },
}

// Minimal in-memory fake — the whole point of ADR 0001's repository pattern.
function makeFakeRepo(overrides: Partial<IAuthRepository> = {}) {
  const unsubscribe = vi.fn()
  return {
    signUp: vi.fn(async (_c: Credentials) => session),
    signIn: vi.fn(async (_c: Credentials) => session),
    signInWithOAuth: vi.fn(async (_p: 'google', _r: string) => {}),
    signOut: vi.fn(async () => {}),
    getSession: vi.fn(async () => session),
    onAuthStateChange: vi.fn(() => unsubscribe),
    ...overrides,
  } satisfies IAuthRepository
}

const valid: Credentials = { email: 'a@b.com', password: 'secret123' }

describe('AuthService', () => {
  describe('validation', () => {
    it('rejects an email without "@" and never hits the repo', async () => {
      const repo = makeFakeRepo()
      const service = new AuthService(repo)

      await expect(
        service.signIn({ email: 'nope', password: 'secret123' }),
      ).rejects.toThrow('Enter a valid email address')
      expect(repo.signIn).not.toHaveBeenCalled()
    })

    it('rejects a password shorter than 6 chars and never hits the repo', async () => {
      const repo = makeFakeRepo()
      const service = new AuthService(repo)

      await expect(
        service.signUp({ email: 'a@b.com', password: '12345' }),
      ).rejects.toThrow('Password must be at least 6 characters')
      expect(repo.signUp).not.toHaveBeenCalled()
    })
  })

  describe('delegation', () => {
    it('signIn passes valid credentials through and returns the repo session', async () => {
      const repo = makeFakeRepo()
      const service = new AuthService(repo)

      await expect(service.signIn(valid)).resolves.toEqual(session)
      expect(repo.signIn).toHaveBeenCalledWith(valid)
    })

    it('signUp passes valid credentials through and returns the repo session', async () => {
      const repo = makeFakeRepo()
      const service = new AuthService(repo)

      await expect(service.signUp(valid)).resolves.toEqual(session)
      expect(repo.signUp).toHaveBeenCalledWith(valid)
    })

    it('signOut / getSession delegate without validation', async () => {
      const repo = makeFakeRepo()
      const service = new AuthService(repo)

      await service.signOut()
      expect(repo.signOut).toHaveBeenCalledOnce()

      await expect(service.getSession()).resolves.toEqual(session)
      expect(repo.getSession).toHaveBeenCalledOnce()
    })

    it('signInWithOAuth delegates provider and redirect without validation', async () => {
      const repo = makeFakeRepo()
      const service = new AuthService(repo)

      await service.signInWithOAuth('google', 'http://localhost:3000/auth/callback')
      expect(repo.signInWithOAuth).toHaveBeenCalledWith(
        'google',
        'http://localhost:3000/auth/callback',
      )
    })

    it('onAuthStateChange returns the repo unsubscribe fn', () => {
      const repo = makeFakeRepo()
      const service = new AuthService(repo)
      const cb = vi.fn()

      const unsubscribe = service.onAuthStateChange(cb)
      expect(repo.onAuthStateChange).toHaveBeenCalledWith(cb)
      expect(typeof unsubscribe).toBe('function')
    })
  })
})
