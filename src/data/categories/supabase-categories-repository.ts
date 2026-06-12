import { supabase } from '#/lib/supabase'
import type { Database } from '#/lib/database.types'
import type { Category, CategoryCreate } from '#/features/categories/types'
import type { ICategoryRepository } from './ICategoryRepository'

type CategoryRow = Database['public']['Tables']['categories']['Row']

// Map the snake_case DB row to the camelCase domain type so the rest of the app
// never sees the storage shape (mirrors SupabaseProfileRepository's toUserProfile).
function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    colorHex: row.color_hex,
    icon: row.icon,
    isSystem: row.is_system,
    isDefault: row.is_default,
  }
}

export class SupabaseCategoryRepository implements ICategoryRepository {
  async listAvailable(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('name', { ascending: true })
    if (error) throw error
    return data.map(toCategory)
  }

  async create(input: CategoryCreate): Promise<Category> {
    const dbInsert: Database['public']['Tables']['categories']['Insert'] = {
      user_id: input.userId,
      name: input.name,
      color_hex: input.colorHex,
      icon: input.icon,
      is_system: false,
    }
    const { data, error } = await supabase
      .from('categories')
      .insert(dbInsert)
      .select('*')
      .single()
    if (error) throw error
    return toCategory(data)
  }
}
