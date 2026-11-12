import type { QueryClient } from '@tanstack/react-query'

// Query Key Factory: the single definition of every TanStack Query cache key in
// the app. Hooks build keys here instead of writing array literals, so a query
// and the mutations that invalidate it can never drift apart (a mistyped
// literal fails silently — the invalidation just matches nothing).
//
// Keys are hierarchical: a function that takes fewer arguments returns a prefix
// of the fuller key, which is what `invalidateQueries` matches on. E.g.
// `transactions.infinite(userId)` invalidates every cached date window of
// `transactions.infinite(userId, from, to)`.
export const queryKeys = {
  profile: {
    byAuthUser: (authUserId: string) => ['profile', authUserId] as const,
  },
  categories: {
    list: (userId: string) => ['categories', userId] as const,
    infinite: (userId: string) => ['categories', 'infinite', userId] as const,
  },
  transactions: {
    /** Omit the window to get the prefix covering every cached window. */
    infinite: (userId: string, window?: { from: string; to: string }) =>
      window
        ? ([
            'transactions',
            'infinite',
            userId,
            window.from,
            window.to,
          ] as const)
        : (['transactions', 'infinite', userId] as const),
    /** Omit the range to get the prefix covering every cached range. */
    periodSummary: (userId: string, range?: { start: string; end: string }) =>
      range
        ? ([
            'transactions',
            'period-summary',
            userId,
            range.start,
            range.end,
          ] as const)
        : (['transactions', 'period-summary', userId] as const),
  },
  recurring: {
    list: (userId: string) => ['recurring', userId] as const,
    confirmedHistory: (id: string) =>
      ['recurring', 'confirmed-history', id] as const,
    /** Omit the period key to get the prefix covering every Period. */
    recent: (userId: string, periodKey?: string) =>
      periodKey === undefined
        ? (['recurring', 'recent', userId] as const)
        : (['recurring', 'recent', userId, periodKey] as const),
  },
  reports: {
    all: (userId: string) => ['reports', userId] as const,
    report: (userId: string, view: string, windowKey: string) =>
      ['reports', userId, view, windowKey] as const,
  },
}

// Refresh everything derived from the user's transactions that the Dashboard
// shows: the infinite list and the Period summary, across every cached window.
// Returns the promise so `mutateAsync` resolves only after the caches refresh.
export function invalidateTransactionViews(
  queryClient: QueryClient,
  userId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.transactions.infinite(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.transactions.periodSummary(userId),
    }),
  ])
}

// Refresh both category caches (the full lookup and the paged management list).
export function invalidateCategoryViews(
  queryClient: QueryClient,
  userId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.categories.list(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.categories.infinite(userId),
    }),
  ])
}
