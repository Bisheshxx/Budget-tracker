import { supabase } from '#/lib/supabase'
import type { Database } from '#/lib/database.types'
import type {
  MonthlyNth,
  MonthlyRule,
  RecurringFrequency,
  RecurringKind,
  RecurringOccurrence,
  RecurringOccurrenceStatus,
  RecurringTransaction,
  RecurringTransactionCreate,
  RecurringTransactionUpdate,
} from '#/features/recurring/types'
import type {
  Transaction,
  TransactionType,
} from '#/shared/types/transaction.type'
import type {
  IRecurringTransactionRepository,
  RecentlyPostedItem,
} from './IRecurringTransactionRepository'

type RecurringTransactionRow =
  Database['public']['Tables']['recurring_transactions']['Row']
type OccurrenceRow =
  Database['public']['Tables']['recurring_transaction_occurrences']['Row']
type TransactionRow = Database['public']['Tables']['transactions']['Row']
type LegacyRecurringTransactionRow = RecurringTransactionRow & {
  anchor_day?: number
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

function rowDate(row: RecurringTransactionRow): string {
  return row.created_at.slice(0, 10)
}

function formatUtcDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return formatUtcDate(new Date(Date.UTC(year, month - 1, day + days)))
}

function firstDueDateFromLegacyAnchor(
  row: LegacyRecurringTransactionRow,
): string {
  const createdDate = rowDate(row)
  const anchorDay = row.anchor_day
  if (anchorDay == null) return createdDate

  if (row.frequency === 'monthly') {
    const [year, month, createdDay] = createdDate.split('-').map(Number)
    const dueDay = Math.min(Math.max(anchorDay, 1), 28)
    if (dueDay >= createdDay) {
      return `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`
    }
    return formatUtcDate(new Date(Date.UTC(year, month, dueDay)))
  }

  const [year, month, day] = createdDate.split('-').map(Number)
  const createdDow = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return addDays(createdDate, (anchorDay - createdDow + 7) % 7)
}

function firstDueDateForRow(row: RecurringTransactionRow): string {
  if (YMD_RE.test(row.first_due_date)) return row.first_due_date
  return firstDueDateFromLegacyAnchor(row)
}

// Reconstruct the domain MonthlyRule from the three flat columns. Defends
// against a monthly row missing monthly_rule_type (should be impossible post
// migration — every monthly row is backfilled to day-of-month — but falls back
// to a day-of-month rule derived from the resolved firstDueDate rather than
// trusting that blindly).
function monthlyRuleForRow(row: RecurringTransactionRow): MonthlyRule | null {
  if (row.frequency !== 'monthly') return null
  if (
    row.monthly_rule_type === 'nth-weekday' &&
    row.monthly_weekday != null &&
    row.monthly_nth != null
  ) {
    return {
      type: 'nth-weekday',
      weekday: row.monthly_weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      nth: row.monthly_nth as MonthlyNth,
    }
  }
  return {
    type: 'day-of-month',
    day: Number(firstDueDateForRow(row).slice(8, 10)),
  }
}

// Map the snake_case DB rows to the camelCase domain types so the rest of the
// app never sees the storage shape (mirrors SupabaseTransactionRepository).
function toRecurringTransaction(
  row: RecurringTransactionRow,
): RecurringTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    name: row.name,
    amountCents: row.amount_cents,
    kind: row.kind as RecurringKind,
    frequency: row.frequency as RecurringFrequency,
    monthlyRule: monthlyRuleForRow(row),
    firstDueDate: firstDueDateForRow(row),
    active: row.active,
    createdAt: row.created_at,
    deactivatedAt: row.deactivated_at,
  }
}

function toOccurrence(row: OccurrenceRow): RecurringOccurrence {
  return {
    id: row.id,
    recurringTransactionId: row.recurring_transaction_id,
    occurrenceDate: row.occurrence_date,
    status: row.status as RecurringOccurrenceStatus,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
  }
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    type: row.type as TransactionType,
    amountCents: row.amount_cents,
    note: row.note,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
  }
}

function monthlyRuleColumns(monthlyRule: MonthlyRule | null): {
  monthly_rule_type: string | null
  monthly_weekday: number | null
  monthly_nth: number | null
} {
  if (monthlyRule?.type === 'nth-weekday') {
    return {
      monthly_rule_type: 'nth-weekday',
      monthly_weekday: monthlyRule.weekday,
      monthly_nth: monthlyRule.nth,
    }
  }
  if (monthlyRule?.type === 'day-of-month') {
    return {
      monthly_rule_type: 'day-of-month',
      monthly_weekday: null,
      monthly_nth: null,
    }
  }
  return { monthly_rule_type: null, monthly_weekday: null, monthly_nth: null }
}

export class SupabaseRecurringTransactionRepository implements IRecurringTransactionRepository {
  async listActive(userId: string): Promise<RecurringTransaction[]> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data.map(toRecurringTransaction)
  }

  async listAll(userId: string): Promise<RecurringTransaction[]> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('active', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data.map(toRecurringTransaction)
  }

  async create(
    input: RecurringTransactionCreate,
  ): Promise<RecurringTransaction> {
    const dbInsert: Database['public']['Tables']['recurring_transactions']['Insert'] =
      {
        user_id: input.userId,
        category_id: input.categoryId,
        name: input.name,
        amount_cents: input.amountCents,
        kind: input.kind,
        frequency: input.frequency,
        first_due_date: input.firstDueDate,
        ...monthlyRuleColumns(input.monthlyRule),
      }
    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert(dbInsert)
      .select('*')
      .single()
    if (error) throw error
    return toRecurringTransaction(data)
  }

  async update(
    id: string,
    input: RecurringTransactionUpdate,
  ): Promise<RecurringTransaction> {
    const dbUpdate: Database['public']['Tables']['recurring_transactions']['Update'] =
      {
        category_id: input.categoryId,
        name: input.name,
        amount_cents: input.amountCents,
        kind: input.kind,
        frequency: input.frequency,
        first_due_date: input.firstDueDate,
        ...monthlyRuleColumns(input.monthlyRule),
      }
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(dbUpdate)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return toRecurringTransaction(data)
  }

  async deactivate(id: string): Promise<RecurringTransaction> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update({ active: false, deactivated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return toRecurringTransaction(data)
  }

  async delete(id: string): Promise<void> {
    // Always sever first (a no-op update when nothing is linked): this makes it
    // correct whether or not the template has confirmed history, and the
    // cascade on recurring_transaction_occurrences then safely removes the
    // template's own occurrence rows — every transaction they pointed at has
    // already had its link nulled, so nothing confirmed is ever lost. See
    // docs/adr/0010.
    const { error: severError } = await supabase
      .from('transactions')
      .update({ recurring_transaction_id: null })
      .eq('recurring_transaction_id', id)
    if (severError) throw severError

    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  async hasConfirmedHistory(id: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('recurring_transaction_occurrences')
      .select('id', { count: 'exact', head: true })
      .eq('recurring_transaction_id', id)
      .eq('status', 'confirmed')
    if (error) throw error
    return (count ?? 0) > 0
  }

  async listOccurrencesInRange(
    recurringTransactionIds: string[],
    startInclusive: string,
    endExclusive: string,
  ): Promise<RecurringOccurrence[]> {
    if (recurringTransactionIds.length === 0) return []
    const { data, error } = await supabase
      .from('recurring_transaction_occurrences')
      .select('*')
      .in('recurring_transaction_id', recurringTransactionIds)
      .gte('occurrence_date', startInclusive)
      .lt('occurrence_date', endExclusive)
    if (error) throw error
    return data.map(toOccurrence)
  }

  async recordConfirmed(
    recurringTransactionId: string,
    occurrenceDate: string,
    transactionId: string,
  ): Promise<RecurringOccurrence> {
    const dbInsert: Database['public']['Tables']['recurring_transaction_occurrences']['Insert'] =
      {
        recurring_transaction_id: recurringTransactionId,
        occurrence_date: occurrenceDate,
        status: 'confirmed',
        transaction_id: transactionId,
      }
    // First writer wins: DO NOTHING on conflict (not overwrite) so concurrent
    // callers racing for the same slot (client on load + the daily cron) can't
    // clobber each other's transaction_id. A caller that loses the race gets
    // no row back here and must look up the actual winner below.
    const { data: inserted, error: insertError } = await supabase
      .from('recurring_transaction_occurrences')
      .upsert(dbInsert, {
        onConflict: 'recurring_transaction_id,occurrence_date',
        ignoreDuplicates: true,
      })
      .select('*')
    if (insertError) throw insertError
    if (inserted.length > 0) return toOccurrence(inserted[0])

    const { data: existing, error: selectError } = await supabase
      .from('recurring_transaction_occurrences')
      .select('*')
      .eq('recurring_transaction_id', recurringTransactionId)
      .eq('occurrence_date', occurrenceDate)
      .single()
    if (selectError) throw selectError
    return toOccurrence(existing)
  }

  async recordSkipped(
    recurringTransactionId: string,
    occurrenceDate: string,
  ): Promise<RecurringOccurrence> {
    const dbUpsert: Database['public']['Tables']['recurring_transaction_occurrences']['Insert'] =
      {
        recurring_transaction_id: recurringTransactionId,
        occurrence_date: occurrenceDate,
        status: 'skipped',
        transaction_id: null,
      }
    const { data, error } = await supabase
      .from('recurring_transaction_occurrences')
      .upsert(dbUpsert, {
        onConflict: 'recurring_transaction_id,occurrence_date',
        ignoreDuplicates: false,
      })
      .select('*')
      .single()
    if (error) throw error
    return toOccurrence(data)
  }

  async listRecentlyConfirmed(
    userId: string,
    since: string,
  ): Promise<RecentlyPostedItem[]> {
    const { data, error } = await supabase
      .from('recurring_transaction_occurrences')
      .select('*, recurring_transactions!inner(*), transactions!inner(*)')
      .eq('status', 'confirmed')
      .eq('recurring_transactions.user_id', userId)
      .gte('occurrence_date', since)
      .order('occurrence_date', { ascending: false })
    if (error) throw error

    type JoinedRow = OccurrenceRow & {
      recurring_transactions: RecurringTransactionRow
      transactions: TransactionRow
    }

    return (data as unknown as JoinedRow[]).map((row) => ({
      occurrence: toOccurrence(row),
      recurringTransaction: toRecurringTransaction(row.recurring_transactions),
      transaction: toTransaction(row.transactions),
    }))
  }
}
