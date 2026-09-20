import { useEffect, useRef } from 'react'
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { recurringService } from '#/features/recurring'
import { useProfile } from '#/shared/hooks/use-profile'
import { resolvePeriod, todayYmd } from '#/shared/lib/period'
import type { RecentlyPostedItem } from '#/data/recurring/IRecurringTransactionRepository'
import type { RecurringInput } from './schema'
import type {
  RecurringOccurrence,
  RecurringTransaction,
} from '#/features/recurring/types'

const recurringQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['recurring', userId] as const,
    queryFn: () => recurringService.listAll(userId),
  })

interface RecurringResult {
  recurringTransactions: RecurringTransaction[]
  loading: boolean
  isError: boolean
  error: unknown
}

// All of the current user's recurring templates (active + deactivated), for the
// management screen. Disabled until the profile resolves.
export function useRecurringTransactions(): RecurringResult {
  const { profile, loading: profileLoading } = useProfile()
  const userId = profile?.id ?? null

  const query = useQuery({
    ...recurringQueryOptions(userId ?? ''),
    enabled: !!userId,
  })

  return {
    recurringTransactions: query.data ?? [],
    loading: profileLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

function useInvalidateRecurring() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const queryClient = useQueryClient()
  return () => {
    if (!userId) return
    return queryClient.invalidateQueries({ queryKey: ['recurring', userId] })
  }
}

export function useCreateRecurring() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const invalidate = useInvalidateRecurring()

  return useMutation({
    mutationFn: (input: RecurringInput) => {
      if (!userId) throw new Error('No profile loaded')
      return recurringService.create(userId, input)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateRecurring() {
  const invalidate = useInvalidateRecurring()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecurringInput }) =>
      recurringService.update(id, input),
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
    queryKey: ['recurring', 'confirmed-history', id] as const,
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
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const queryClient = useQueryClient()

  return () => {
    if (!userId) return
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['recurring', 'recent', userId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'recent', userId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'period-summary', userId],
      }),
      queryClient.invalidateQueries({ queryKey: ['reports', userId] }),
    ])
  }
}

function useReconcileDue() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const startDay = profile?.budgetPeriodStartDay ?? 1
  const invalidate = useInvalidateAfterResolve()

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('No profile loaded')
      return recurringService.reconcileDue(userId, todayYmd(), startDay)
    },
    onSuccess: invalidate,
  })
}

// Fires reconcileDue once per Period (keyed like useRecentlyPosted's periodKey)
// so it doesn't re-run on every render. Intended to be called from the
// component that also renders the recently-posted list, so importing that
// component is the only wiring a route needs.
export function useAutoReconcile() {
  const { profile } = useProfile()
  const startDay = profile?.budgetPeriodStartDay ?? 1
  const periodKey = resolvePeriod(todayYmd(), startDay).start
  const reconcile = useReconcileDue()
  const mutateRef = useRef(reconcile.mutate)
  mutateRef.current = reconcile.mutate

  useEffect(() => {
    if (!profile) return
    mutateRef.current()
    // Deliberately keyed on [profile?.id, periodKey], not `profile` itself or
    // `mutate` — this should re-fire only when the user or the Period changes.
  }, [profile?.id, periodKey])
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
  const { profile, loading: profileLoading } = useProfile()
  const id = profile?.id ?? ''
  const startDay = profile?.budgetPeriodStartDay ?? 1
  const periodKey = resolvePeriod(todayYmd(), startDay).start

  const query = useQuery({
    queryKey: ['recurring', 'recent', id, periodKey] as const,
    queryFn: () => recurringService.listRecentlyPosted(id, periodKey),
    enabled: !!id,
  })

  return {
    items: query.data ?? [],
    loading: profileLoading || query.isLoading,
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
