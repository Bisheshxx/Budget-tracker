import { useEffect, useRef } from 'react'
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { recurringService } from '#/features/recurring'
import { invalidateTransactionViews, queryKeys } from '#/shared/lib/query-keys'
import { useLedger } from '#/shared/hooks/use-ledger'
import { resolvePeriod } from '#/shared/lib/period'
import type { RecentlyPostedItem } from '#/data/recurring/IRecurringTransactionRepository'
import type { RecurringInput } from './schema'
import type {
  RecurringOccurrence,
  RecurringTransaction,
} from '#/features/recurring/types'

const recurringQueryOptions = (householdId: string) =>
  queryOptions({
    queryKey: queryKeys.recurring.list(householdId),
    queryFn: () => recurringService.listAll(householdId),
  })

interface RecurringResult {
  recurringTransactions: RecurringTransaction[]
  loading: boolean
  isError: boolean
  error: unknown
}

// All of the active Household's recurring templates (active + deactivated), for
// the management screen. Disabled until the Household resolves.
export function useRecurringTransactions(): RecurringResult {
  const { ledger, loading: ledgerLoading } = useLedger()
  const householdId = ledger?.householdId ?? null

  const query = useQuery({
    ...recurringQueryOptions(householdId ?? ''),
    enabled: !!householdId,
  })

  return {
    recurringTransactions: query.data ?? [],
    loading: ledgerLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

function useInvalidateRecurring() {
  const { ledger } = useLedger()
  const householdId = ledger?.householdId ?? null
  const queryClient = useQueryClient()
  return () => {
    if (!householdId) return
    return queryClient.invalidateQueries({
      queryKey: queryKeys.recurring.list(householdId),
    })
  }
}

export function useCreateRecurring() {
  const { ledger, today } = useLedger()
  const invalidate = useInvalidateRecurring()

  return useMutation({
    mutationFn: (input: RecurringInput) => {
      if (!ledger) throw new Error('No group loaded')
      return recurringService.create(ledger, input, today)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateRecurring() {
  const { today } = useLedger()
  const invalidate = useInvalidateRecurring()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecurringInput }) =>
      recurringService.update(id, input, today),
    onSuccess: invalidate,
  })
}

export function useDeactivateRecurring() {
  const invalidate = useInvalidateRecurring()

  return useMutation({
    mutationFn: (id: string) => recurringService.deactivate(id),
    onSuccess: invalidate,
  })
}

export function useDeleteRecurring() {
  const invalidate = useInvalidateRecurring()

  return useMutation({
    mutationFn: (id: string) => recurringService.delete(id),
    onSuccess: invalidate,
  })
}

// Whether a template has confirmed history — drives the delete confirm
// dialog's copy only, not delete's actual (always-safe) behavior.
export function useHasConfirmedHistory(id: string) {
  return useQuery({
    queryKey: queryKeys.recurring.confirmedHistory(id),
    queryFn: () => recurringService.hasConfirmedHistory(id),
  })
}

// Skip the next (not-yet-posted) occurrence of a template ahead of time, e.g.
// "don't post rent this month". Invalidates the recurring list so any shown
// "next occurrence" recomputes.
export function useSkipUpcoming() {
  const invalidate = useInvalidateRecurring()

  return useMutation({
    mutationFn: ({
      recurringTransactionId,
      occurrenceDate,
    }: {
      recurringTransactionId: string
      occurrenceDate: string
    }) => recurringService.skipUpcoming(recurringTransactionId, occurrenceDate),
    onSuccess: invalidate,
  })
}

// Invalidate everything a reconcile/skip touches: the recently-posted list plus
// the Cashflow totals the affected transaction feeds.
function useInvalidateAfterResolve() {
  const { ledger } = useLedger()
  const householdId = ledger?.householdId ?? null
  const queryClient = useQueryClient()

  return () => {
    if (!householdId) return
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.recurring.recent(householdId),
      }),
      invalidateTransactionViews(queryClient, householdId),
      queryClient.invalidateQueries({
        queryKey: queryKeys.reports.all(householdId),
      }),
    ])
  }
}

function useReconcileDue() {
  const { ledger, today } = useLedger()
  const invalidate = useInvalidateAfterResolve()

  return useMutation({
    mutationFn: () => {
      if (!ledger) throw new Error('No group loaded')
      return recurringService.reconcileDue(ledger, today, ledger.periodStartDay)
    },
    onSuccess: invalidate,
  })
}

// Fires reconcileDue once per Period (keyed like useRecentlyPosted's periodKey)
// so it doesn't re-run on every render. Intended to be called from the
// component that also renders the recently-posted list, so importing that
// component is the only wiring a route needs.
export function useAutoReconcile() {
  const { ledger, today } = useLedger()
  const householdId = ledger?.householdId ?? null
  const periodKey = resolvePeriod(today, ledger?.periodStartDay ?? 1).start
  const reconcile = useReconcileDue()
  const mutateRef = useRef(reconcile.mutate)
  mutateRef.current = reconcile.mutate

  useEffect(() => {
    if (!householdId) return
    mutateRef.current()
    // Deliberately keyed on [householdId, periodKey], not `ledger` itself or
    // `mutate` — this should re-fire only when the Household or the Period
    // changes.
  }, [householdId, periodKey])
}

interface RecentlyPostedResult {
  items: RecentlyPostedItem[]
  loading: boolean
  isError: boolean
  error: unknown
}

// Occurrences reconcileDue auto-posted in the current Period, joined with their
// template and the transaction they created — the Dashboard's "Recently
// posted" list.
export function useRecentlyPosted(): RecentlyPostedResult {
  const { ledger, today, loading: ledgerLoading } = useLedger()
  const id = ledger?.householdId ?? ''
  const periodKey = resolvePeriod(today, ledger?.periodStartDay ?? 1).start

  const query = useQuery({
    queryKey: queryKeys.recurring.recent(id, periodKey),
    queryFn: () => recurringService.listRecentlyPosted(id, periodKey),
    enabled: !!id,
  })

  return {
    items: query.data ?? [],
    loading: ledgerLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

// Undo an auto-posted transaction: deletes it and flips its occurrence to
// skipped.
export function useSkipDue() {
  const invalidate = useInvalidateAfterResolve()

  return useMutation({
    mutationFn: (occurrence: RecurringOccurrence) =>
      recurringService.skip(occurrence),
    onSuccess: invalidate,
  })
}
