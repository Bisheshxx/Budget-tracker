import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { transactionService } from '#/features/transactions'
import { useProfile } from '#/features/profile/use-profile'
import type { QuickAddInput } from './schema'
import type { Transaction } from '#/features/transactions/types'

const RECENT_LIMIT = 10

const recentTransactionsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['transactions', 'recent', userId] as const,
    queryFn: () => transactionService.listRecent(userId, RECENT_LIMIT),
  })

interface RecentTransactionsResult {
  transactions: Transaction[]
  loading: boolean
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
  }
}

// Create mutation that invalidates the recent list on success so the new entry
// shows immediately.
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
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'recent', userId],
      })
    },
  })
}
