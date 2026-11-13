import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { transactionService } from '#/features/transactions'
import { TRANSACTION_PAGE_SIZE } from '#/shared/constants/transactions.constant'
import { invalidateTransactionViews, queryKeys } from '#/shared/lib/query-keys'
import { useLedger } from '#/shared/hooks/use-ledger'
import { daysIntoPeriod, resolvePeriod } from '#/shared/lib/period'
import { nextPageCursor } from '#/shared/utils/pagination.util'
import type { PeriodRange } from '#/shared/lib/period'
import type {
  PeriodSummary,
  Transaction,
  TransactionPageCursor,
} from '#/shared/types/transaction.type'

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
// to the active Household. The
// optional `bounds` is a half-open [from, to) date window; when omitted the list
// defaults to the current Period (so it matches the "This Period" card). PRD B
// passes an explicit Range here to re-scope both. Disabled until the Household
// resolves; the date window is part of the cache key so each Range caches apart.
export function useTransactionsInfinite(bounds?: {
  from?: string
  to?: string
}): InfiniteTransactionsResult {
  const { ledger, today, loading: ledgerLoading } = useLedger()
  const householdId = ledger?.householdId ?? null
  const startDay = ledger?.periodStartDay ?? 1

  const period = resolvePeriod(today, startDay)
  const from = bounds?.from ?? period.start
  const to = bounds?.to ?? period.end
  const id = householdId ?? ''

  const query = useInfiniteQuery({
    queryKey: queryKeys.transactions.infinite(id, { from, to }),
    queryFn: ({ pageParam }) =>
      transactionService.listPage(id, {
        from,
        to,
        limit: TRANSACTION_PAGE_SIZE,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as TransactionPageCursor | null,
    getNextPageParam: (lastPage) =>
      nextPageCursor(lastPage, TRANSACTION_PAGE_SIZE, (last) => ({
        // Transactions resume from the last row's keyset cursor.
        transactionDate: last.transactionDate,
        id: last.id,
      })),
    enabled: !!householdId,
  })

  return {
    transactions: query.data?.pages.flat() ?? [],
    loading: ledgerLoading || query.isLoading,
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

// The Cashflow summary scoped to the active Household. Defaults to the current
// Period (resolved from the Household's start day against its today, via the pure
// helpers in #/shared/lib/period); pass `bounds` to scope it to an arbitrary Range
// instead (PRD B). Both ends of the resolved range feed the cache key, so the
// current Period and each Range cache apart. Disabled until the Household resolves.
export function usePeriodSummary(bounds?: PeriodRange): PeriodSummaryResult {
  const { ledger, today, loading: ledgerLoading } = useLedger()
  const householdId = ledger?.householdId ?? null
  const startDay = ledger?.periodStartDay ?? 1

  const range = bounds ?? resolvePeriod(today, startDay)
  const id = householdId ?? ''

  const query = useQuery({
    queryKey: queryKeys.transactions.periodSummary(id, range),
    queryFn: () => transactionService.getPeriodSummary(id, range),
    enabled: !!householdId,
  })

  return {
    summary: query.data ?? null,
    daysIntoPeriod: daysIntoPeriod(today, startDay),
    loading: ledgerLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

// Delete mutation. Refreshes the recent list and Period summary so a deleted
// transaction disappears from both.
export function useDeleteTransaction() {
  const { ledger } = useLedger()
  const householdId = ledger?.householdId ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => transactionService.delete(id),
    onSuccess: () => {
      if (!householdId) return
      return invalidateTransactionViews(queryClient, householdId)
    },
  })
}
