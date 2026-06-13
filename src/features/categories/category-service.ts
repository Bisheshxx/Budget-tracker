import { createCategorySchema } from './schema'
import type { CategoryCreateInput } from './schema'
import type { Category } from '#/features/categories/types'
import type { ICategoryRepository } from '#/data/categories/ICategoryRepository'

// Thin service over the category repository. Validates via the shared schema (the
// backstop, not just the UI) and persists. Inject a fake ICategoryRepository in
// tests — no Supabase, no RLS. See ADR 0001.
export class CategoryService {
  constructor(private readonly repo: ICategoryRepository) {}

  listAvailable(userId: string): Promise<Category[]> {
    return this.repo.listAvailable(userId)
  }

  async create(userId: string, input: CategoryCreateInput): Promise<Category> {
    const result = createCategorySchema.safeParse(input)
    if (!result.success) {
      throw new Error(result.error.issues[0].message)
    }
    const v = result.data

    return this.repo.create({
      userId,
      name: v.name,
      colorHex: v.colorHex,
      icon: v.icon ?? null,
    })
  }

  // Delete one of the user's own categories. System categories are refused here
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
