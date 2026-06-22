import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { recurringService } from '#/features/recurring'
import { useProfile } from '#/features/profile/use-profile'
import { resolvePeriod, todayYmd } from '#/shared/period'
import type { RecurringInput } from './schema'
import type { QuickAddInput } from '#/features/transactions/schema'
import type {
  DueOccurrence,
  RecurringExpense,
} from '#/features/recurring/types'

const recurringQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['recurring', userId] as const,
    queryFn: () => recurringService.listAll(userId),
  })

interface RecurringResult {
  recurringExpenses: RecurringExpense[]
  loading: boolean
  isError: boolean
  error: unknown
}

// All of the current user's recurring templates (active + deactivated), for the
// management screen. Disabled until the profile resolves.
export function useRecurringExpenses(): RecurringResult {
  const { profile, loading: profileLoading } = useProfile()
  const userId = profile?.id ?? null

  const query = useQuery({
    ...recurringQueryOptions(userId ?? ''),
    enabled: !!userId,
  })

  return {
    recurringExpenses: query.data ?? [],
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

interface DueResult {
  due: DueOccurrence[]
  loading: boolean
  isError: boolean
  error: unknown
}

// The Due items to prompt for in the current Period. Keyed by the Period start
// (via resolvePeriod) so it refreshes when the Period rolls over. Disabled until
// the profile resolves.
export function useDueRecurring(): DueResult {
  const { profile, loading: profileLoading } = useProfile()
  const id = profile?.id ?? ''
  const startDay = profile?.budgetPeriodStartDay ?? 1
  const today = todayYmd()
  const periodKey = resolvePeriod(today, startDay).start

  const query = useQuery({
    queryKey: ['recurring', 'due', id, periodKey] as const,
    queryFn: () => recurringService.listDue(id, today, startDay),
    enabled: !!id,
  })

  return {
    due: query.data ?? [],
    loading: profileLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

// Invalidate everything a confirm/skip touches: the Due list (the resolved item
// drops off) plus, for confirm, the recent list and Cashflow totals the new
// transaction feeds.
function useInvalidateAfterResolve() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const queryClient = useQueryClient()

  return () => {
    if (!userId) return
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['recurring', 'due', userId] }),
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'recent', userId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'period-summary', userId],
      }),
    ])
  }
}

export function useConfirmDue() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const invalidate = useInvalidateAfterResolve()

  return useMutation({
    mutationFn: ({
      due,
      input,
    }: {
      due: DueOccurrence
      input: QuickAddInput
    }) => {
      if (!userId) throw new Error('No profile loaded')
      return recurringService.confirm(userId, due, input)
    },
    onSuccess: invalidate,
  })
}

export function useSkipDue() {
  const invalidate = useInvalidateAfterResolve()

  return useMutation({
    mutationFn: (due: DueOccurrence) => recurringService.skip(due),
    onSuccess: invalidate,
  })
}
