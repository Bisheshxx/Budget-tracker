import { supabase } from '#/lib/supabase'
import type { Database } from '#/lib/database.types'
import type {
  Transaction,
  TransactionCreate,
  TransactionPageParams,
  TransactionType,
  TransactionUpdate,
} from '#/shared/types/transaction.type'
import { toDataError } from '#/data/supabase-error'
import type { ITransactionRepository } from './ITransactionRepository'

type TransactionRow = Database['public']['Tables']['transactions']['Row']

// Map the snake_case DB row to the camelCase domain type so the rest of the app
// never sees the storage shape (mirrors SupabaseProfileRepository's toUserProfile).
// `is_recurring` is intentionally not mapped — it is dropped in issue 09 and the
// domain type does not model it. Exported so the recurring repository maps its
// joined transaction rows through the same function.
export function toTransaction(
  row: TransactionRow,
  recurringOwnerId: string | null = null,
): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    type: row.type as TransactionType,
    amountCents: row.amount_cents,
    note: row.note,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
    createdBy: row.created_by,
    recurringOwnerId,
  }
}

// List reads also fetch who owns the Recurring Transaction behind an
// auto-posted row, so a shared ledger can say whose it is.
const LIST_SELECT = '*, recurring_transactions(user_id)'

function toListedTransaction(
  row: TransactionRow & {
    recurring_transactions: { user_id: string } | null
  },
): Transaction {
  return toTransaction(row, row.recurring_transactions?.user_id ?? null)
}

export class SupabaseTransactionRepository implements ITransactionRepository {
  async listPage(
    householdId: string,
    { from, to, limit, cursor }: TransactionPageParams,
  ): Promise<Transaction[]> {
    let query = supabase
      .from('transactions')
      .select(LIST_SELECT)
      .eq('household_id', householdId)
      .order('transaction_date', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)

    if (from) query = query.gte('transaction_date', from)
    if (to) query = query.lt('transaction_date', to)

    // Keyset predicate: resume strictly *after* the cursor row in
    // (transaction_date desc, id desc) order — an earlier date, or the same date
    // with a smaller id. ANDed with the date window above.
    if (cursor) {
      query = query.or(
        `transaction_date.lt.${cursor.transactionDate},` +
          `and(transaction_date.eq.${cursor.transactionDate},id.lt.${cursor.id})`,
      )
    }

    const { data, error } = await query
    if (error) throw toDataError(error)
    return data.map(toListedTransaction)
  }

  async listInRange(
    householdId: string,
    startInclusive: string,
    endExclusive: string,
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(LIST_SELECT)
      .eq('household_id', householdId)
      .gte('transaction_date', startInclusive)
      .lt('transaction_date', endExclusive)
      .order('transaction_date', { ascending: true })
      .order('id', { ascending: true })
    if (error) throw toDataError(error)
    return data.map(toListedTransaction)
  }

  async create(input: TransactionCreate): Promise<Transaction> {
    const dbInsert: Database['public']['Tables']['transactions']['Insert'] = {
      household_id: input.householdId,
      user_id: input.userId,
      category_id: input.categoryId,
      type: input.type,
      amount_cents: input.amountCents,
      note: input.note,
      transaction_date: input.transactionDate,
      recurring_transaction_id: input.recurringTransactionId ?? null,
    }
    const { data, error } = await supabase
      .from('transactions')
      .insert(dbInsert)
      .select('*')
      .single()
    if (error) throw toDataError(error)
    return toTransaction(data)
  }

  async createForRecurringOccurrence(
    input: TransactionCreate,
  ): Promise<Transaction> {
    const dbInsert: Database['public']['Tables']['transactions']['Insert'] = {
      household_id: input.householdId,
      user_id: input.userId,
      category_id: input.categoryId,
      type: input.type,
      amount_cents: input.amountCents,
      note: input.note,
      transaction_date: input.transactionDate,
      recurring_transaction_id: input.recurringTransactionId ?? null,
    }
    // First writer wins: DO NOTHING on conflict (not overwrite), mirroring
    // SupabaseRecurringTransactionRepository.recordConfirmed's pattern — see
    // that method's comment and the transactions_recurring_transaction_id_
    // transaction_date_key migration.
    const { data: inserted, error: insertError } = await supabase
      .from('transactions')
      .upsert(dbInsert, {
        onConflict: 'recurring_transaction_id,transaction_date',
        ignoreDuplicates: true,
      })
      .select('*')
    if (insertError) throw toDataError(insertError)
    if (inserted.length > 0) return toTransaction(inserted[0])

    const { data: existing, error: selectError } = await supabase
      .from('transactions')
      .select('*')
      .eq('recurring_transaction_id', input.recurringTransactionId as string)
      .eq('transaction_date', input.transactionDate)
      .single()
    if (selectError) throw toDataError(selectError)
    return toTransaction(existing)
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
    if (error) throw toDataError(error)
    return toTransaction(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw toDataError(error)
  }
}
