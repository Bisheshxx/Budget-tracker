import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '#/features/transactions'
import { useProfile } from '#/shared/hooks/use-profile'
import type { QuickAddInput } from '#/shared/schemas/transaction.schema'

// Refresh the infinite list and the Period summary so every mutation
// (create/update) reflects in the list and the Cashflow totals. Each key
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
// Lives in shared (not the transactions feature) because recurring's Due-Now
// flow reuses QuickAddForm, which needs these mutations. See docs/adr/0009.
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
