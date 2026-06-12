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
    onSuccess: () => {
      if (!userId) return
      queryClient.invalidateQueries({ queryKey: ['categories', userId] })
    },
  })
}
