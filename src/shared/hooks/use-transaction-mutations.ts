import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '#/features/transactions'
import { invalidateTransactionViews } from '#/shared/lib/query-keys'
import { useLedger } from '#/shared/hooks/use-ledger'
import type { QuickAddInput } from '#/shared/schemas/transaction.schema'

// Create mutation that refreshes the recent list and Period summary on success.
// Lives in shared (not the transactions feature) because recurring's Due-Now
// flow reuses QuickAddForm, which needs these mutations. See docs/adr/0009.
export function useCreateTransaction() {
  const { ledger } = useLedger()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: QuickAddInput) => {
      if (!ledger) throw new Error('No group loaded')
      return transactionService.create(ledger, input)
    },
    onSuccess: () => {
      if (!ledger) return
      return invalidateTransactionViews(queryClient, ledger.householdId)
    },
  })
}

// Edit mutation. Refreshes the recent list and Period summary so an edited
// amount/type/category/date is reflected in both the list and the totals.
export function useUpdateTransaction() {
  const { ledger } = useLedger()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: QuickAddInput }) =>
      transactionService.update(id, input),
    onSuccess: () => {
      if (!ledger) return
      return invalidateTransactionViews(queryClient, ledger.householdId)
    },
  })
}
