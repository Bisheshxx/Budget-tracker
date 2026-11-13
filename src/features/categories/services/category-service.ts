import { parseOrThrow } from '#/shared/utils/validation.util'
import {
  createCategorySchema,
  updateCategorySchema,
} from '#/shared/schemas/category.schema'
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
} from '#/shared/schemas/category.schema'
import type {
  Category,
  CategoryPageRequest,
} from '#/shared/types/category.type'
import type { LedgerScope } from '#/shared/types/household.type'
import type { ICategoryRepository } from '#/data/categories/ICategoryRepository'

// Thin service over the category repository. Validates via the shared schema (the
// backstop, not just the UI) and persists. Inject a fake ICategoryRepository in
// tests — no Supabase, no RLS. See ADR 0001.
export class CategoryService {
  constructor(private readonly repo: ICategoryRepository) {}

  listAvailable(householdId: string): Promise<Category[]> {
    return this.repo.listAvailable(householdId)
  }

  listAvailablePage(
    householdId: string,
    request: CategoryPageRequest,
  ): Promise<Category[]> {
    return this.repo.listAvailablePage(householdId, request)
  }

  async create(
    scope: LedgerScope,
    input: CategoryCreateInput,
  ): Promise<Category> {
    const v = parseOrThrow(createCategorySchema, input)

    return this.repo.create({
      householdId: scope.householdId,
      userId: scope.profileId,
      name: v.name,
      colorHex: v.colorHex,
      icon: v.icon ?? null,
    })
  }

  // Edit one of the Household's own categories. System categories are read-only; keep
  // that rule in the service so tests and non-UI callers get the same guard.
  async update(
    category: Category,
    input: CategoryUpdateInput,
  ): Promise<Category> {
    if (category.isSystem) {
      throw new Error('System categories cannot be edited')
    }
    const v = parseOrThrow(updateCategorySchema, input)

    return this.repo.update(category.id, {
      name: v.name,
      colorHex: v.colorHex,
      icon: v.icon ?? null,
    })
  }

  // Delete one of the Household's own categories. System categories are refused here
  // (the backstop, mirrored by RLS), so the guard holds even if the UI lets one
  // through. Any transactions in the deleted category fall back to Uncategorized
  // via the DB FK (`on delete set null`) — nothing to reassign in app code.
  async delete(category: Category): Promise<void> {
    if (category.isSystem) {
      throw new Error('System categories cannot be deleted')
    }
    await this.repo.delete(category.id)
  }
}
