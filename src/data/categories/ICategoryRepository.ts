import type {
  Category,
  CategoryCreate,
  CategoryPageRequest,
  CategoryUpdate,
} from '#/shared/types/category.type'

export interface ICategoryRepository {
  /** System categories + the Household's own, name-ordered. */
  listAvailable: (householdId: string) => Promise<Category[]>
  /** System categories + the Household's own, newest-created first. */
  listAvailablePage: (
    householdId: string,
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
