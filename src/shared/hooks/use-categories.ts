import {
  useInfiniteQuery,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { categoryService } from '#/features/categories'
import {
  invalidateCategoryViews,
  invalidateTransactionViews,
  queryKeys,
} from '#/shared/lib/query-keys'
import { useLedger } from '#/shared/hooks/use-ledger'
import { CATEGORY_PAGE_SIZE } from '#/shared/constants/categories.constant'
import { nextPageCursor } from '#/shared/utils/pagination.util'
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
} from '#/shared/schemas/category.schema'
import type { Category, CategoryPageCursor } from '#/shared/types/category.type'

const categoriesQueryOptions = (householdId: string) =>
  queryOptions({
    queryKey: queryKeys.categories.list(householdId),
    queryFn: () => categoryService.listAvailable(householdId),
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

// System categories + the active Household's own. Disabled until the
// Household resolves. Lives in shared (not the categories feature) because
// transactions, recurring, and reports all consume it. See docs/adr/0009.
export function useCategories(): CategoriesResult {
  const { ledger, loading: ledgerLoading } = useLedger()
  const householdId = ledger?.householdId ?? null

  const query = useQuery({
    ...categoriesQueryOptions(householdId ?? ''),
    enabled: !!householdId,
  })

  return {
    categories: query.data ?? [],
    loading: ledgerLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

// Newest-created system + own categories, paged for dashboard management UI.
// Other category consumers keep using useCategories() because they need the
// complete lookup for selectors and transaction category labels.
export function useCategoriesInfinite(): InfiniteCategoriesResult {
  const { ledger, loading: ledgerLoading } = useLedger()
  const householdId = ledger?.householdId ?? null
  const id = householdId ?? ''

  const query = useInfiniteQuery({
    queryKey: queryKeys.categories.infinite(id),
    queryFn: ({ pageParam }) =>
      categoryService.listAvailablePage(id, {
        limit: CATEGORY_PAGE_SIZE,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as CategoryPageCursor | null,
    getNextPageParam: (lastPage) =>
      nextPageCursor(lastPage, CATEGORY_PAGE_SIZE, (last) => ({
        createdAt: last.createdAt,
        id: last.id,
      })),
    enabled: !!householdId,
  })

  return {
    categories: query.data?.pages.flat() ?? [],
    loading: ledgerLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}

// Create mutation that invalidates the categories list on success.
export function useCreateCategory() {
  const { ledger } = useLedger()
  const householdId = ledger?.householdId ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CategoryCreateInput) => {
      if (!ledger) throw new Error('No group loaded')
      return categoryService.create(ledger, input)
    },
    // Return the invalidation promise so mutateAsync resolves only after the
    // categories cache has refreshed (CategoryCreateForm reopens the picker on
    // resolve and must see the new row).
    onSuccess: () => {
      if (!householdId) return
      return invalidateCategoryViews(queryClient, householdId)
    },
  })
}

// Update mutation. Category names/colors/icons are denormalized only by id in
// transaction summaries and rows, so invalidate categories plus transaction
// views that render category labels and spend breakdowns.
export function useUpdateCategory() {
  const { ledger } = useLedger()
  const householdId = ledger?.householdId ?? null
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
      if (!householdId) return
      return Promise.all([
        invalidateCategoryViews(queryClient, householdId),
        invalidateTransactionViews(queryClient, householdId),
      ])
    },
  })
}

// Delete mutation. Invalidates the categories list and the recent-transactions
// list, since deleting a category in use nulls those transactions' category
// (they re-render as Uncategorized).
export function useDeleteCategory() {
  const { ledger } = useLedger()
  const householdId = ledger?.householdId ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (category: Category) => categoryService.delete(category),
    onSuccess: () => {
      if (!householdId) return
      return Promise.all([
        invalidateCategoryViews(queryClient, householdId),
        // The deleted category's expenses fall back to Uncategorized, shifting
        // the spend-by-category breakdown.
        invalidateTransactionViews(queryClient, householdId),
      ])
    },
  })
}
