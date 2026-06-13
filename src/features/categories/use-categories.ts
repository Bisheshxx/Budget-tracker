import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { categoryService } from '#/features/categories'
import { useProfile } from '#/features/profile/use-profile'
import type { CategoryCreateInput } from './schema'
import type { Category } from '#/features/categories/types'

const categoriesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['categories', userId] as const,
    queryFn: () => categoryService.listAvailable(userId),
  })

interface CategoriesResult {
  categories: Category[]
  loading: boolean
  isError: boolean
  error: unknown
}

// System + own categories for the current user's profile. Disabled until the
// profile resolves.
export function useCategories(): CategoriesResult {
  const { profile, loading: profileLoading } = useProfile()
  const userId = profile?.id ?? null

  const query = useQuery({
    ...categoriesQueryOptions(userId ?? ''),
    enabled: !!userId,
  })

  return {
    categories: query.data ?? [],
    loading: profileLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

// Create mutation that invalidates the categories list on success.
export function useCreateCategory() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CategoryCreateInput) => {
      if (!userId) throw new Error('No profile loaded')
      return categoryService.create(userId, input)
    },
    // Return the invalidation promise so mutateAsync resolves only after the
    // categories cache has refreshed (CategoryCreateForm reopens the picker on
    // resolve and must see the new row).
    onSuccess: () => {
      if (!userId) return
      return queryClient.invalidateQueries({ queryKey: ['categories', userId] })
    },
  })
}

// Delete mutation. Invalidates the categories list and the recent-transactions
// list, since deleting a category in use nulls those transactions' category
// (they re-render as Uncategorized).
export function useDeleteCategory() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (category: Category) => categoryService.delete(category),
    onSuccess: () => {
      if (!userId) return
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories', userId] }),
        queryClient.invalidateQueries({
          queryKey: ['transactions', 'recent', userId],
        }),
        // The deleted category's expenses fall back to Uncategorized, shifting
        // the spend-by-category breakdown.
        queryClient.invalidateQueries({
          queryKey: ['transactions', 'period-summary', userId],
        }),
      ])
    },
  })
}
