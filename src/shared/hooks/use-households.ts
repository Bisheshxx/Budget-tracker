import { useCallback, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { householdService } from '#/features/households'
import { queryKeys } from '#/shared/lib/query-keys'
import { useProfile } from '#/shared/hooks/use-profile'
import {
  readActiveHouseholdId,
  subscribeActiveHousehold,
  writeActiveHouseholdId,
} from '#/shared/lib/active-household-storage'
import type { Household } from '#/shared/types/household.type'

const NO_HOUSEHOLDS: readonly Household[] = []

interface HouseholdsResult {
  /** Every Household the user belongs to: Personal first, then groups. */
  households: readonly Household[]
  /** The Household the app is currently showing, or null until loaded. */
  active: Household | null
  loading: boolean
  /** Switch the active Household (remembered on this device). */
  setActive: (householdId: string) => void
}

// The user's Households and which one is active. Lives in shared (like
// useProfile) because the app chrome and every ledger feature read it. The list
// is server state in the TanStack Query cache; the active id is a per-device
// preference (see #/shared/lib/active-household-storage).
export function useHouseholds(): HouseholdsResult {
  const { profile, loading: profileLoading } = useProfile()
  const profileId = profile?.id ?? null

  const query = useQuery({
    queryKey: queryKeys.households.list(profileId ?? ''),
    queryFn: () => householdService.list(profileId ?? ''),
    enabled: !!profileId,
  })

  const rememberedId = useSyncExternalStore(
    subscribeActiveHousehold,
    () => (profileId ? readActiveHouseholdId(profileId) : null),
    () => null,
  )

  const households = query.data ?? NO_HOUSEHOLDS

  const setActive = useCallback(
    (householdId: string) => {
      if (profileId) writeActiveHouseholdId(profileId, householdId)
    },
    [profileId],
  )

  return {
    households,
    active: householdService.resolveActive(households, rememberedId),
    loading: profileLoading || query.isLoading,
    setActive,
  }
}
