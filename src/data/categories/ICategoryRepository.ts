import type { Category, CategoryCreate } from '#/features/categories/types'

export interface ICategoryRepository {
  /** System categories (user_id null) + the user's own, name-ordered. */
  listAvailable: (userId: string) => Promise<Category[]>
  create: (input: CategoryCreate) => Promise<Category>
  /**
   * Delete a category by id. The DB nulls any transactions' `category_id`
   * (FK `on delete set null` → they show as Uncategorized); RLS blocks
   * deleting system rows. The service guards system rows before reaching here.
   */
  delete: (categoryId: string) => Promise<void>
}
