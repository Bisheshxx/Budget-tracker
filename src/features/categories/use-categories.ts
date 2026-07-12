import {
  useInfiniteQuery,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { categoryService } from '#/features/categories'
import { useProfile } from '#/features/profile/use-profile'
import { CATEGORY_PAGE_SIZE } from './constants/categories.constant'
import type { CategoryCreateInput, CategoryUpdateInput } from './schema'
import type {
  Category,
  CategoryPageCursor,
} from '#/features/categories/types'

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

interface InfiniteCategoriesResult extends CategoriesResult {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

function nextCategoryPageCursor(
  page: Category[],
  pageSize: number,
): CategoryPageCursor | undefined {
  if (page.length < pageSize) return undefined
  const last = page[page.length - 1]
  return { createdAt: last.createdAt, id: last.id }
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

// Newest-created system + own categories, paged for dashboard management UI.
// Other category consumers keep using useCategories() because they need the
// complete lookup for selectors and transaction category labels.
export function useCategoriesInfinite(): InfiniteCategoriesResult {
  const { profile, loading: profileLoading } = useProfile()
  const userId = profile?.id ?? null
  const id = userId ?? ''

  const query = useInfiniteQuery({
    queryKey: ['categories', 'infinite', id] as const,
    queryFn: ({ pageParam }) =>
      categoryService.listAvailablePage(id, {
        limit: CATEGORY_PAGE_SIZE,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as CategoryPageCursor | null,
    getNextPageParam: (lastPage) =>
      nextCategoryPageCursor(lastPage, CATEGORY_PAGE_SIZE),
    enabled: !!userId,
  })

  return {
    categories: query.data?.pages.flat() ?? [],
    loading: profileLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
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
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories', userId] }),
        queryClient.invalidateQueries({
          queryKey: ['categories', 'infinite', userId],
        }),
      ])
    },
  })
}

// Update mutation. Category names/colors/icons are denormalized only by id in
// transaction summaries and rows, so invalidate categories plus transaction
// views that render category labels and spend breakdowns.
export function useUpdateCategory() {
  const { profile } = useProfile()
  const userId = profile?.id ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      category,
      input,
    }: {
      category: Category
      input: CategoryUpdateInput
    }) => categoryService.update(category, input),
    onSuccess: () => {
      if (!userId) return
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories', userId] }),
        queryClient.invalidateQueries({
          queryKey: ['categories', 'infinite', userId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['transactions', 'infinite', userId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['transactions', 'period-summary', userId],
        }),
      ])
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
          queryKey: ['categories', 'infinite', userId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['transactions', 'infinite', userId],
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
