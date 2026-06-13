import { SupabaseCategoryRepository } from './supabase-categories-repository'
import type { ICategoryRepository } from './ICategoryRepository'

// THE swap point for category data. Replace this one construction to move to an
// axios/REST backend later; nothing else references the concrete implementation.
export const categoryRepository: ICategoryRepository =
  new SupabaseCategoryRepository()
