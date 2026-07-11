import { z } from 'zod'
import { supabase } from '#/lib/supabase'
import type { Database } from '#/lib/database.types'
import type {
  Category,
  CategoryCreate,
  CategoryPageRequest,
  CategoryUpdate,
} from '#/features/categories/types'
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
    createdAt: row.created_at,
  }
}

export class SupabaseCategoryRepository implements ICategoryRepository {
  async listAvailable(userId: string): Promise<Category[]> {
    // Validate before interpolating into the PostgREST `.or` filter string so a
    // malformed id can't inject filter syntax (comma/paren) into the query.
    const safeUserId = z.string().uuid().parse(userId)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${safeUserId}`)
      .order('name', { ascending: true })
    if (error) throw error
    return data.map(toCategory)
  }

  async listAvailablePage(
    userId: string,
    request: CategoryPageRequest,
  ): Promise<Category[]> {
    const safeUserId = z.string().uuid().parse(userId)
    let query = supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${safeUserId}`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(request.limit)

    if (request.cursor) {
      query = query.or(
        `created_at.lt.${request.cursor.createdAt},and(created_at.eq.${request.cursor.createdAt},id.lt.${request.cursor.id})`,
      )
    }

    const { data, error } = await query
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

  async update(categoryId: string, input: CategoryUpdate): Promise<Category> {
    const safeId = z.string().uuid().parse(categoryId)
    const dbUpdate: Database['public']['Tables']['categories']['Update'] = {
      name: input.name,
      color_hex: input.colorHex,
      icon: input.icon,
    }
    const { data, error } = await supabase
      .from('categories')
      .update(dbUpdate)
      .eq('id', safeId)
      .select('*')
      .single()
    if (error) throw error
    return toCategory(data)
  }

  async delete(categoryId: string): Promise<void> {
    // Validate before filtering so a malformed id can't slip into the query.
    const safeId = z.string().uuid().parse(categoryId)
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', safeId)
    if (error) throw error
  }
}
