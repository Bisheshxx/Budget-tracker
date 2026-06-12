import { supabase } from '#/lib/supabase'
import type { Database } from '#/lib/database.types'
import type { ProfileUpdate, UserProfile } from '#/features/profile/types'
import type { IProfileRepository } from './IProfileRepository'

type ProfileRow = Database['public']['Tables']['user_profiles']['Row']

// Map the snake_case DB row to the camelCase domain type so the rest of the app
// never sees the storage shape (mirrors SupabaseAuthRepository's toAuthSession).
function toUserProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    currency: row.currency,
    budgetPeriodStartDay: row.budget_period_start_day,
    groceryDayOfWeek: row.grocery_day_of_week,
    monthlyBudgetTargetCents: row.monthly_budget_target,
  }
}

export class SupabaseProfileRepository implements IProfileRepository {
  async getByAuthUserId(authUserId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    if (error) throw error
    return data ? toUserProfile(data) : null
  }

  async update(
    authUserId: string,
    patch: ProfileUpdate,
  ): Promise<UserProfile> {
    const dbPatch: Database['public']['Tables']['user_profiles']['Update'] = {
      display_name: patch.displayName,
      currency: patch.currency,
      budget_period_start_day: patch.budgetPeriodStartDay,
      grocery_day_of_week: patch.groceryDayOfWeek,
      monthly_budget_target: patch.monthlyBudgetTargetCents,
    }
    const { data, error } = await supabase
      .from('user_profiles')
      .update(dbPatch)
      .eq('auth_user_id', authUserId)
      .select('*')
      .single()
    if (error) throw error
    return toUserProfile(data)
  }
}
