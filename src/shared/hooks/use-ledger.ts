import { useMemo } from 'react'
import { useHouseholds } from '#/shared/hooks/use-households'
import { useProfile } from '#/shared/hooks/use-profile'
import { deviceTimeZone, todayInZone } from '#/shared/lib/period'
import type { Ledger } from '#/shared/types/household.type'

interface LedgerResult {
  /** The active Household's scope and settings, or null until it has loaded. */
  ledger: Ledger | null
  /**
   * Today ('YYYY-MM-DD') in the active Household's time zone — the date every
   * Period and "due" calculation starts from, so all members agree on it.
   */
  today: string
  loading: boolean
}

// The one place a ledger screen learns which Household it is showing and that
// Household's currency, Period start day and "today". Every ledger hook scopes
// its queries and cache keys by `ledger.householdId`, so switching the active
// Household (HouseholdSwitcher) re-points the whole app. See docs/adr/0012.
export function useLedger(): LedgerResult {
  const { profile, loading: profileLoading } = useProfile()
  const { active, loading: householdsLoading } = useHouseholds()
  const profileId = profile?.id ?? null

  const ledger = useMemo<Ledger | null>(() => {
    if (!active || !profileId) return null
    return {
      householdId: active.id,
      profileId,
      currency: active.currency,
      periodStartDay: active.periodStartDay,
      timeZone: active.timeZone ?? deviceTimeZone(),
    }
  }, [active, profileId])

  return {
    ledger,
    today: todayInZone(ledger?.timeZone ?? deviceTimeZone()),
    loading: profileLoading || householdsLoading,
  }
}
