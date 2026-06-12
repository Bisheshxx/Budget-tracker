import { queryOptions, useQuery } from '@tanstack/react-query'
import { profileService } from '#/features/profile'
import { useAuth } from '#/features/auth/auth-context'
import type { UserProfile } from '#/data/profile/profile-repository'

interface ProfileResult {
  profile: UserProfile | null
  /** True until the profile has been resolved for the current session. */
  loading: boolean
  /** Whether the user has finished Onboarding (display name set). */
  isOnboarded: boolean
  /** Re-fetch the profile (e.g. right after completing Onboarding). */
  refresh: () => Promise<void>
}

// Single source of truth for the profile query key + fetcher. Kept as a factory
// so it can be promoted to an export and reused in route loaders later
// (context.queryClient.ensureQueryData(...)) per ADR 0001's deferred-SSR note.
const profileQueryOptions = (authUserId: string) =>
  queryOptions({
    queryKey: ['profile', authUserId] as const,
    queryFn: () => profileService.getProfile(authUserId),
  })

// The profile is server state (a Supabase row), so it lives in the TanStack
// Query cache — which dedupes by query key, so every caller shares one fetch
// without a React Context. This hook is a thin, typed wrapper over that query.
export function useProfile(): ProfileResult {
  const { session, loading: authLoading } = useAuth()
  const authUserId = session?.user.id ?? null

  const query = useQuery({
    ...profileQueryOptions(authUserId ?? ''),
    enabled: !authLoading && !!authUserId,
  })

  const profile = query.data ?? null

  return {
    profile,
    // authLoading covers the "session not resolved yet" window; query.isLoading
    // is false while disabled (logged out), so this resolves to false there.
    loading: authLoading || query.isLoading,
    isOnboarded: profileService.isOnboarded(profile),
    refresh: async () => {
      // refetch() resolves (doesn't reject) on a failed fetch, so surface the
      // error explicitly — callers like OnboardingForm await this and must fail
      // fast rather than route on as if the refresh succeeded.
      const result = await query.refetch()
      if (result.error) throw result.error
    },
  }
}
