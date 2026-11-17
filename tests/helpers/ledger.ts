import { todayYmd } from '#/shared/lib/period.ts'
import type { Ledger } from '#/shared/types/household.type.ts'

// Stand-ins for what `useLedger` returns, for hook and component tests that
// mock it. The Household id and the profile id are deliberately different so a
// test notices if one is used where the other belongs.
export const ledger: Ledger = {
  householdId: 'house-1',
  profileId: 'profile-1',
  currency: 'USD',
  periodStartDay: 1,
  timeZone: 'UTC',
}

/** The active Household has loaded. */
export function ledgerLoaded(overrides: Partial<Ledger> = {}) {
  return {
    ledger: { ...ledger, ...overrides },
    today: todayYmd(),
    loading: false,
  }
}

/** No active Household yet: still loading, or signed out (`loading: false`). */
export function ledgerPending(loading = true) {
  return { ledger: null, today: todayYmd(), loading }
}
