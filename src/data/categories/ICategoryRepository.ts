import type { Category, CategoryCreate } from '#/features/categories/types'

export interface ICategoryRepository {
  /** System categories (user_id null) + the user's own, name-ordered. */
  listAvailable: (userId: string) => Promise<Category[]>
  create: (input: CategoryCreate) => Promise<Category>
}
