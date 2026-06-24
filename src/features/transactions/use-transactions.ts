import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { transactionService } from '#/features/transactions'
import { useProfile } from '#/features/profile/use-profile'
import { daysIntoPeriod, resolvePeriod, todayYmd } from '#/shared/period'
import type { QuickAddInput } from './schema'
import type {
  PeriodSummary,
  Transaction,
  TransactionPageCursor,
} from '#/features/transactions/types'

// Infinite-scroll page size for the Dashboard transaction list (see PRD A).
const PAGE_SIZE = 25

interface InfiniteTransactionsResult {
  transactions: Transaction[]
  loading: boolean
  isError: boolean
  error: unknown
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

// The Dashboard transaction list as an infinite, keyset-paginated query, scoped
// to the user's profile id (transactions.user_id — NOT the auth user id). The
// optional `bounds` is a half-open [from, to) date window; when omitted the list
// defaults to the current Period (so it matches the "This Period" card). PRD B
// passes an explicit Range here to re-scope both. Disabled until the profile
// resolves; the date window is part of the cache key so each Range caches apart.
export function useTransactionsInfinite(bounds?: {
  from?: string
  to?: string
}): InfiniteTransactionsResult {
  const { profile, loading: profileLoading } = useProfile()
  const userId = profile?.id ?? null
  const startDay = profile?.budgetPeriodStartDay ?? 1

  const period = resolvePeriod(todayYmd(), startDay)
  const from = bounds?.from ?? period.start
  const to = bounds?.to ?? period.end
  const id = userId ?? ''

  const query = useInfiniteQuery({
    queryKey: ['transactions', 'infinite', id, from, to],
    queryFn: ({ pageParam }) =>
      transactionService.listPage(id, {
        from,
        to,
        limit: PAGE_SIZE,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as TransactionPageCursor | null,
    // A short page means there's nothing after it. Otherwise resume from the
    // last row's (transactionDate, id) keyset cursor.
    getNextPageParam: (lastPage): TransactionPageCursor | undefined => {
      if (lastPage.length < PAGE_SIZE) return undefined
      const last = lastPage[lastPage.length - 1]
      return { transactionDate: last.transactionDate, id: last.id }
    },
    enabled: !!userId,
  })

  return {
    transactions: query.data?.pages.flat() ?? [],
    loading: profileLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}

interface PeriodSummaryResult {
  summary: PeriodSummary | null
  /** 1-based day count into the current Period (anchor day = 1). */
  daysIntoPeriod: number
  loading: boolean
  isError: boolean
  error: unknown
}

// The current Period's Cashflow summary, scoped to the user's profile. The
// Period range is resolved from the profile's start day against today (pure
// helpers in #/shared/period); the resolved start doubles as the cache key so
// crossing into a new Period refetches. Disabled until the profile resolves.
export function usePeriodSummary(): PeriodSummaryResult {
  const { profile, loading: profileLoading } = useProfile()
  const userId = profile?.id ?? null
  const startDay = profile?.budgetPeriodStartDay ?? 1

  const today = todayYmd()
  const range = resolvePeriod(today, startDay)
  const id = userId ?? ''

  const query = useQuery({
    queryKey: ['transactions', 'period-summary', id, range.start],
    queryFn: () => transactionService.getPeriodSummary(id, range),
    enabled: !!userId,
  })

  return {
    summary: query.data ?? null,
    daysIntoPeriod: daysIntoPeriod(today, startDay),
    loading: profileLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

// Refresh the infinite list and the Period summary so every mutation
// (create/update/delete) reflects in the list and the Cashflow totals. Each key
// omits its trailing dimensions (date window / period start) so the prefix match
// invalidates every cached window. Returns the promise so mutateAsync resolves
// only after the caches have refreshed (the dialog closes on resolve).
function invalidateTransactionCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['transactions', 'infinite', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['transactions', 'period-summary', userId],
    }),
  ])
}

// Create mutation that refreshes the recent list and Period summary on success.
export function useCreateTransaction() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: QuickAddInput) => {
      if (!userId) throw new Error('No profile loaded')
      return transactionService.create(userId, input)
    },
    onSuccess: () => {
      if (!userId) return
      return invalidateTransactionCaches(queryClient, userId)
    },
  })
}

// Edit mutation. Refreshes the recent list and Period summary so an edited
// amount/type/category/date is reflected in both the list and the totals.
export function useUpdateTransaction() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: QuickAddInput }) =>
      transactionService.update(id, input),
    onSuccess: () => {
      if (!userId) return
      return invalidateTransactionCaches(queryClient, userId)
    },
  })
}

// Delete mutation. Refreshes the recent list and Period summary so a deleted
// transaction disappears from both.
export function useDeleteTransaction() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => transactionService.delete(id),
    onSuccess: () => {
      if (!userId) return
      return invalidateTransactionCaches(queryClient, userId)
    },
  })
}
