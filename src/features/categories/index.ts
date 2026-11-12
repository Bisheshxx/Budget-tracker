import { categoryRepository } from '#/data/categories'
import { CategoryService } from '#/features/categories/services/category-service'

// Composition root for the categories feature: the app-wide CategoryService
// singleton, wired to the active repository.
// The backend behind it is chosen in src/data/index.ts (docs/adr/0011) —
// nothing here changes on a swap.
export const categoryService = new CategoryService(categoryRepository)
