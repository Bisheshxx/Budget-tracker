// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryHarness } from '../../helpers/query-client.ts'
import { queryKeys } from '#/shared/lib/query-keys.ts'

const { useAuth, getProfile } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getProfile: vi.fn(),
}))

vi.mock('#/features/auth/contexts/auth-context', () => ({ useAuth }))
vi.mock('#/features/profile', () => ({
  profileService: {
    getProfile,
    isOnboarded: (p: { onboardingCompletedAt: string | null } | null) =>
      p != null && p.onboardingCompletedAt != null,
  },
}))

const { useProfile } = await import('#/shared/hooks/use-profile.ts')

const profile = { id: 'profile-1', onboardingCompletedAt: '2026-06-01' }

afterEach(() => vi.clearAllMocks())

describe('useProfile', () => {
  it('stays loading and does not fetch while the session is resolving', () => {
    useAuth.mockReturnValue({ session: null, loading: true })

    const { result } = renderHook(() => useProfile(), {
      wrapper: createQueryHarness().wrapper,
    })

    expect(result.current.loading).toBe(true)
    expect(getProfile).not.toHaveBeenCalled()
  })

  it('resolves to no profile, not loading, when logged out', () => {
    useAuth.mockReturnValue({ session: null, loading: false })

    const { result } = renderHook(() => useProfile(), {
      wrapper: createQueryHarness().wrapper,
    })

    expect(result.current).toMatchObject({
      profile: null,
      loading: false,
      isOnboarded: false,
    })
    expect(getProfile).not.toHaveBeenCalled()
  })

  it('fetches the profile for the signed-in auth user', async () => {
    useAuth.mockReturnValue({
      session: { user: { id: 'auth-1' } },
      loading: false,
    })
    getProfile.mockResolvedValue(profile)

    const { result } = renderHook(() => useProfile(), {
      wrapper: createQueryHarness().wrapper,
    })

    await waitFor(() => expect(result.current.profile).toEqual(profile))
    expect(getProfile).toHaveBeenCalledWith('auth-1')
    expect(result.current.isOnboarded).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('refresh re-fetches, and rejects when the re-fetch fails', async () => {
    useAuth.mockReturnValue({
      session: { user: { id: 'auth-1' } },
      loading: false,
    })
    getProfile.mockResolvedValue(profile)

    const { result } = renderHook(() => useProfile(), {
      wrapper: createQueryHarness().wrapper,
    })
    await waitFor(() => expect(result.current.profile).toEqual(profile))

    await result.current.refresh()
    expect(getProfile).toHaveBeenCalledTimes(2)

    getProfile.mockRejectedValue(new Error('offline'))
    await expect(result.current.refresh()).rejects.toThrow('offline')
  })

  it('refresh also refreshes the Household list, whose settings mirror the profile', async () => {
    useAuth.mockReturnValue({
      session: { user: { id: 'auth-1' } },
      loading: false,
    })
    getProfile.mockResolvedValue(profile)
    const harness = createQueryHarness()
    const householdsKey = queryKeys.households.list('profile-1')
    harness.seed(householdsKey)

    const { result } = renderHook(() => useProfile(), {
      wrapper: harness.wrapper,
    })
    await waitFor(() => expect(result.current.profile).toEqual(profile))

    await result.current.refresh()

    expect(harness.isStale(householdsKey)).toBe(true)
  })
})
