import { supabase } from '#/lib/supabase'
import type { Database } from '#/lib/database.types'
import type {
  Transaction,
  TransactionCreate,
  TransactionType,
  TransactionUpdate,
} from '#/features/transactions/types'
import type { ITransactionRepository } from './ITransactionRepository'

type TransactionRow = Database['public']['Tables']['transactions']['Row']

// Map the snake_case DB row to the camelCase domain type so the rest of the app
// never sees the storage shape (mirrors SupabaseProfileRepository's toUserProfile).
// `is_recurring` is intentionally not mapped — it is dropped in issue 09 and the
// domain type does not model it.
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

export class SupabaseTransactionRepository implements ITransactionRepository {
  async listRecent(userId: string, limit: number): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data.map(toTransaction)
  }

  async listInRange(
    userId: string,
    startInclusive: string,
    endExclusive: string,
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('transaction_date', startInclusive)
      .lt('transaction_date', endExclusive)
      .order('transaction_date', { ascending: true })
      .order('id', { ascending: true })
    if (error) throw error
    return data.map(toTransaction)
  }

  async create(input: TransactionCreate): Promise<Transaction> {
    const dbInsert: Database['public']['Tables']['transactions']['Insert'] = {
      user_id: input.userId,
      category_id: input.categoryId,
      type: input.type,
      amount_cents: input.amountCents,
      note: input.note,
      transaction_date: input.transactionDate,
    }
    const { data, error } = await supabase
      .from('transactions')
      .insert(dbInsert)
      .select('*')
      .single()
    if (error) throw error
    return toTransaction(data)
  }

  async update(id: string, input: TransactionUpdate): Promise<Transaction> {
    const dbUpdate: Database['public']['Tables']['transactions']['Update'] = {
      category_id: input.categoryId,
      type: input.type,
      amount_cents: input.amountCents,
      note: input.note,
      transaction_date: input.transactionDate,
    }
    const { data, error } = await supabase
      .from('transactions')
      .update(dbUpdate)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return toTransaction(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
  }
}
