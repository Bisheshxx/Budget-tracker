import { categoryRepository } from '#/data/categories'
import { CategoryService } from './category-service'

// Composition root for the categories feature: the app-wide CategoryService
// singleton, wired to the active repository. Swap the repository in
// #/data/categories to move off Supabase.
export const categoryService = new CategoryService(categoryRepository)
