import {
  queryOptions,
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
} from '#/features/transactions/types'

const RECENT_LIMIT = 10

const recentTransactionsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['transactions', 'recent', userId] as const,
    queryFn: () => transactionService.listRecent(userId, RECENT_LIMIT),
  })

interface RecentTransactionsResult {
  transactions: Transaction[]
  loading: boolean
  isError: boolean
  error: unknown
}

// The recent-transactions list, scoped to the current user's profile id (which
// is transactions.user_id — NOT the auth user id). Disabled until the profile
// resolves.
export function useRecentTransactions(): RecentTransactionsResult {
  const { profile, loading: profileLoading } = useProfile()
  const userId = profile?.id ?? null

  const query = useQuery({
    ...recentTransactionsQueryOptions(userId ?? ''),
    enabled: !!userId,
  })

  return {
    transactions: query.data ?? [],
    loading: profileLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
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

// Create mutation that invalidates the recent list and the Period summary on
// success so both the list and the Cashflow totals reflect the new entry.
export function useCreateTransaction() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: QuickAddInput) => {
      if (!userId) throw new Error('No profile loaded')
      return transactionService.create(userId, input)
    },
    // Return the invalidation promise so mutateAsync resolves only after the
    // caches have refreshed (QuickAddForm closes on resolve). The period-summary
    // key omits the period start so the prefix match invalidates every Period.
    onSuccess: () => {
      if (!userId) return
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['transactions', 'recent', userId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['transactions', 'period-summary', userId],
        }),
      ])
    },
  })
}
