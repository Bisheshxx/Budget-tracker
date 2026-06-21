import { useCategories } from './use-categories'
import type { Category } from './types'

// Resolve a transaction's categoryId to a real Category row. A null id (or an id
// that no longer exists, e.g. a deleted custom category) falls back to the seeded
// Uncategorized system category — never a hardcoded string. Shared by every
// surface that labels a category (recent list, Cashflow breakdown, Reports) so
// the resolution rule lives in one place.
export function useCategoryLookup() {
  const { categories, loading } = useCategories()

  const byId = new Map(categories.map((c) => [c.id, c]))
  const uncategorized =
    categories.find((c) => c.isSystem && c.name === 'Uncategorized') ?? null
  const categoryFor = (categoryId: string | null): Category | null =>
    categoryId ? (byId.get(categoryId) ?? uncategorized) : uncategorized

  return { categoryFor, categories, loading }
}
