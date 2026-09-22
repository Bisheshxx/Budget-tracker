import { SupabaseRecurringTransactionRepository } from './supabase-recurring-transaction-repository'
import type { IRecurringTransactionRepository } from './IRecurringTransactionRepository'

// THE swap point for recurring-transaction data. Replace this one construction
// to move to an axios/REST backend later; nothing else references the concrete
// implementation.
export const recurringTransactionRepository: IRecurringTransactionRepository =
  new SupabaseRecurringTransactionRepository()
