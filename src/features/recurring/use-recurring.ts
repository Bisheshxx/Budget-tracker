import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { recurringService } from '#/features/recurring'
import { useProfile } from '#/features/profile/use-profile'
import type { RecurringInput } from './schema'
import type { RecurringExpense } from '#/features/recurring/types'

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
