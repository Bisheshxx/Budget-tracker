import { supabase } from '#/lib/supabase'
import type { Database } from '#/lib/database.types'
import type {
  RecurringExpense,
  RecurringExpenseCreate,
  RecurringExpenseUpdate,
  RecurringFrequency,
} from '#/features/recurring/types'
import type { IRecurringExpenseRepository } from './IRecurringExpenseRepository'

type RecurringExpenseRow =
  Database['public']['Tables']['recurring_expenses']['Row']

// Map the snake_case DB row to the camelCase domain type so the rest of the app
// never sees the storage shape (mirrors SupabaseTransactionRepository).
function toRecurringExpense(row: RecurringExpenseRow): RecurringExpense {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    name: row.name,
    amountCents: row.amount_cents,
    frequency: row.frequency as RecurringFrequency,
    anchorDay: row.anchor_day,
    active: row.active,
    createdAt: row.created_at,
    deactivatedAt: row.deactivated_at,
  }
}

export class SupabaseRecurringExpenseRepository implements IRecurringExpenseRepository {
  async listActive(userId: string): Promise<RecurringExpense[]> {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data.map(toRecurringExpense)
  }

  async listAll(userId: string): Promise<RecurringExpense[]> {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('active', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data.map(toRecurringExpense)
  }

  async create(input: RecurringExpenseCreate): Promise<RecurringExpense> {
    const dbInsert: Database['public']['Tables']['recurring_expenses']['Insert'] =
      {
        user_id: input.userId,
        category_id: input.categoryId,
        name: input.name,
        amount_cents: input.amountCents,
        frequency: input.frequency,
        anchor_day: input.anchorDay,
      }
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert(dbInsert)
      .select('*')
      .single()
    if (error) throw error
    return toRecurringExpense(data)
  }

  async update(
    id: string,
    input: RecurringExpenseUpdate,
  ): Promise<RecurringExpense> {
    const dbUpdate: Database['public']['Tables']['recurring_expenses']['Update'] =
      {
        category_id: input.categoryId,
        name: input.name,
        amount_cents: input.amountCents,
        frequency: input.frequency,
        anchor_day: input.anchorDay,
      }
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(dbUpdate)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return toRecurringExpense(data)
  }

  async deactivate(id: string): Promise<RecurringExpense> {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update({ active: false, deactivated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return toRecurringExpense(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
