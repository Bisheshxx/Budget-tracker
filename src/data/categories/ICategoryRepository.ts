import type {
  Category,
  CategoryCreate,
  CategoryPageRequest,
  CategoryUpdate,
} from '#/features/categories/types'

export interface ICategoryRepository {
  /** System categories (user_id null) + the user's own, name-ordered. */
  listAvailable: (userId: string) => Promise<Category[]>
  /** System categories (user_id null) + the user's own, newest-created first. */
  listAvailablePage: (
    userId: string,
    request: CategoryPageRequest,
  ) => Promise<Category[]>
  create: (input: CategoryCreate) => Promise<Category>
  update: (categoryId: string, input: CategoryUpdate) => Promise<Category>
  /**
   * Delete a category by id. The DB nulls any transactions' `category_id`
   * (FK `on delete set null` → they show as Uncategorized); RLS blocks
   * deleting system rows. The service guards system rows before reaching here.
   */
  delete: (categoryId: string) => Promise<void>
}
