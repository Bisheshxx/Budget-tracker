import type {
  Category,
  CategoryPageCursor,
} from '#/features/categories/types/category.type'

export function nextCategoryPageCursor(
  page: Category[],
  pageSize: number,
): CategoryPageCursor | undefined {
  if (page.length < pageSize) return undefined
  const last = page[page.length - 1]
  return { createdAt: last.createdAt, id: last.id }
}
