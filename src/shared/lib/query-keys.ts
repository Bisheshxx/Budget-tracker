import type { QueryClient } from '@tanstack/react-query'

// Query Key Factory: the single definition of every TanStack Query cache key in
// the app. Hooks build keys here instead of writing array literals, so a query
// and the mutations that invalidate it can never drift apart (a mistyped
// literal fails silently — the invalidation just matches nothing).
//
// Ledger keys (categories, transactions, recurring, reports) are scoped by
// Household id, so switching the active Household reads a separate cache.
//
// Keys are hierarchical: a function that takes fewer arguments returns a prefix
// of the fuller key, which is what `invalidateQueries` matches on. E.g.
// `transactions.infinite(householdId)` invalidates every cached date window of
// `transactions.infinite(householdId, { from, to })`.
export const queryKeys = {
  profile: {
    byAuthUser: (authUserId: string) => ['profile', authUserId] as const,
  },
  households: {
    /** Prefix covering every profile's Household list. */
    all: () => ['households'] as const,
    /** The Households a profile is an active member of. */
    list: (profileId: string) => ['households', profileId] as const,
    /** Current and former members of one Household. */
    people: (householdId: string) => ['household-people', householdId] as const,
    /** Invite links that can still be used. */
    invites: (householdId: string) =>
      ['household-invites', householdId] as const,
    invitePreview: (token: string) =>
      ['household-invite-preview', token] as const,
  },
  categories: {
    list: (householdId: string) => ['categories', householdId] as const,
    infinite: (householdId: string) =>
      ['categories', 'infinite', householdId] as const,
  },
  transactions: {
    /** Omit the window to get the prefix covering every cached window. */
    infinite: (householdId: string, window?: { from: string; to: string }) =>
      window
        ? ([
            'transactions',
            'infinite',
            householdId,
            window.from,
            window.to,
          ] as const)
        : (['transactions', 'infinite', householdId] as const),
    /** Omit the range to get the prefix covering every cached range. */
    periodSummary: (
      householdId: string,
      range?: { start: string; end: string },
    ) =>
      range
        ? ([
            'transactions',
            'period-summary',
            householdId,
            range.start,
            range.end,
          ] as const)
        : (['transactions', 'period-summary', householdId] as const),
  },
  recurring: {
    list: (householdId: string) => ['recurring', householdId] as const,
    confirmedHistory: (id: string) =>
      ['recurring', 'confirmed-history', id] as const,
    /** Omit the period key to get the prefix covering every Period. */
    recent: (householdId: string, periodKey?: string) =>
      periodKey === undefined
        ? (['recurring', 'recent', householdId] as const)
        : (['recurring', 'recent', householdId, periodKey] as const),
  },
  reports: {
    all: (householdId: string) => ['reports', householdId] as const,
    report: (householdId: string, view: string, windowKey: string) =>
      ['reports', householdId, view, windowKey] as const,
  },
}

// Refresh everything derived from a Household's transactions that the Dashboard
// shows: the infinite list and the Period summary, across every cached window.
// Returns the promise so `mutateAsync` resolves only after the caches refresh.
export function invalidateTransactionViews(
  queryClient: QueryClient,
  householdId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.transactions.infinite(householdId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.transactions.periodSummary(householdId),
    }),
  ])
}

// Refresh both category caches (the full lookup and the paged management list).
export function invalidateCategoryViews(
  queryClient: QueryClient,
  householdId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.categories.list(householdId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.categories.infinite(householdId),
    }),
  ])
}
