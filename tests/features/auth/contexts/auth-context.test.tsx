// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import type { AuthSession } from '#/features/auth/types/auth.type.ts'

// Mock the auth composition root so the provider is exercised against a fake
// service — no repository, no backend.
const { service } = vi.hoisted(() => ({
  service: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  },
}))

vi.mock('#/features/auth', () => ({ authService: service }))

const { AuthProvider, useAuth } =
  await import('#/features/auth/contexts/auth-context.tsx')

const session: AuthSession = { user: { id: 'auth-1', email: 'a@b.com' } }
const creds = { email: 'a@b.com', password: 'secret123' }

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AuthProvider, null, children)
}

// Wire the fake service; returns the unsubscribe spy and a way to push a
// session change through the subscription the provider registered.
function arrange(initial: Promise<AuthSession | null>) {
  const unsubscribe = vi.fn()
  let listener: (s: AuthSession | null) => void = () => {}
  service.getSession.mockReturnValue(initial)
  service.onAuthStateChange.mockImplementation((callback) => {
    listener = callback
    return unsubscribe
  })
  return { unsubscribe, emit: (s: AuthSession | null) => listener(s) }
}

afterEach(() => vi.clearAllMocks())

describe('AuthProvider', () => {
  it('is loading until the initial session resolves, then exposes it', async () => {
    arrange(Promise.resolve(session))

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toEqual(session)
  })

  it('resolves to signed-out when the initial session lookup fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    arrange(Promise.reject(new Error('offline')))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })

  it('follows session changes pushed by the auth service', async () => {
    const { emit } = arrange(Promise.resolve(null))
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => emit(session))
    expect(result.current.session).toEqual(session)

    act(() => emit(null))
    expect(result.current.session).toBeNull()
  })

  it('unsubscribes on unmount', async () => {
    const { unsubscribe } = arrange(Promise.resolve(null))
    const { result, unmount } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('delegates sign up, sign in and sign out to the auth service', async () => {
    arrange(Promise.resolve(null))
    service.signIn.mockResolvedValue(session)
    service.signUp.mockResolvedValue(null)
    service.signOut.mockResolvedValue(undefined)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.signIn(creds)).resolves.toEqual(session)
    await expect(result.current.signUp(creds)).resolves.toBeNull()
    await result.current.signOut()

    expect(service.signIn).toHaveBeenCalledWith(creds)
    expect(service.signUp).toHaveBeenCalledWith(creds)
    expect(service.signOut).toHaveBeenCalledTimes(1)
  })

  it('starts Google OAuth with a redirect back to /auth/callback', async () => {
    arrange(Promise.resolve(null))
    service.signInWithOAuth.mockResolvedValue(undefined)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.signInWithGoogle()

    expect(service.signInWithOAuth).toHaveBeenCalledWith(
      'google',
      `${window.location.origin}/auth/callback`,
    )
  })
})

describe('useAuth', () => {
  it('throws when used outside an AuthProvider', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    )
    logged.mockRestore()
  })
})
