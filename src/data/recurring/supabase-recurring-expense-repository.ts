import { supabase } from '#/lib/supabase'
import type { Database } from '#/lib/database.types'
import type {
  RecurringExpense,
  RecurringExpenseCreate,
  RecurringExpenseUpdate,
  RecurringFrequency,
  RecurringOccurrence,
  RecurringOccurrenceStatus,
} from '#/features/recurring/types'
import type { IRecurringExpenseRepository } from './IRecurringExpenseRepository'

type RecurringExpenseRow =
  Database['public']['Tables']['recurring_expenses']['Row']
type OccurrenceRow =
  Database['public']['Tables']['recurring_expense_occurrences']['Row']
type LegacyRecurringExpenseRow = RecurringExpenseRow & { anchor_day?: number }

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

function rowDate(row: RecurringExpenseRow): string {
  return row.created_at.slice(0, 10)
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function firstDueDateFromLegacyAnchor(row: LegacyRecurringExpenseRow): string {
  const createdDate = rowDate(row)
  const anchorDay = row.anchor_day
  if (anchorDay == null) return createdDate

  if (row.frequency === 'monthly') {
    const [year, month, createdDay] = createdDate.split('-').map(Number)
    const dueDay = Math.min(Math.max(anchorDay, 1), 28)
    if (dueDay >= createdDay) {
      return `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`
    }
    const next = new Date(Date.UTC(year, month, dueDay))
    return [
      next.getUTCFullYear(),
      String(next.getUTCMonth() + 1).padStart(2, '0'),
      String(next.getUTCDate()).padStart(2, '0'),
    ].join('-')
  }

  const [year, month, day] = createdDate.split('-').map(Number)
  const createdDow = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return addDays(createdDate, (anchorDay - createdDow + 7) % 7)
}

function firstDueDateForRow(row: RecurringExpenseRow): string {
  if (YMD_RE.test(row.first_due_date)) return row.first_due_date
  return firstDueDateFromLegacyAnchor(row)
}

// Map the snake_case DB rows to the camelCase domain types so the rest of the
// app never sees the storage shape (mirrors SupabaseTransactionRepository).
function toRecurringExpense(row: RecurringExpenseRow): RecurringExpense {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    name: row.name,
    amountCents: row.amount_cents,
    frequency: row.frequency as RecurringFrequency,
    firstDueDate: firstDueDateForRow(row),
    active: row.active,
    createdAt: row.created_at,
    deactivatedAt: row.deactivated_at,
  }
}

function toOccurrence(row: OccurrenceRow): RecurringOccurrence {
  return {
    id: row.id,
    recurringExpenseId: row.recurring_expense_id,
    occurrenceDate: row.occurrence_date,
    status: row.status as RecurringOccurrenceStatus,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
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
        first_due_date: input.firstDueDate,
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
        first_due_date: input.firstDueDate,
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

  async listOccurrencesInRange(
    recurringExpenseIds: string[],
    startInclusive: string,
    endExclusive: string,
  ): Promise<RecurringOccurrence[]> {
    if (recurringExpenseIds.length === 0) return []
    const { data, error } = await supabase
      .from('recurring_expense_occurrences')
      .select('*')
      .in('recurring_expense_id', recurringExpenseIds)
      .gte('occurrence_date', startInclusive)
      .lt('occurrence_date', endExclusive)
    if (error) throw error
    return data.map(toOccurrence)
  }

  async recordConfirmed(
    recurringExpenseId: string,
    occurrenceDate: string,
    transactionId: string,
  ): Promise<RecurringOccurrence> {
    const dbInsert: Database['public']['Tables']['recurring_expense_occurrences']['Insert'] =
      {
        recurring_expense_id: recurringExpenseId,
        occurrence_date: occurrenceDate,
        status: 'confirmed',
        transaction_id: transactionId,
      }
    const { data, error } = await supabase
      .from('recurring_expense_occurrences')
      .insert(dbInsert)
      .select('*')
      .single()
    if (error) throw error
    return toOccurrence(data)
  }

  async recordSkipped(
    recurringExpenseId: string,
    occurrenceDate: string,
  ): Promise<RecurringOccurrence> {
    const dbInsert: Database['public']['Tables']['recurring_expense_occurrences']['Insert'] =
      {
        recurring_expense_id: recurringExpenseId,
        occurrence_date: occurrenceDate,
        status: 'skipped',
      }
    const { data, error } = await supabase
      .from('recurring_expense_occurrences')
      .insert(dbInsert)
      .select('*')
      .single()
    if (error) throw error
    return toOccurrence(data)
  }
}
