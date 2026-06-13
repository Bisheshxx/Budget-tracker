import { SupabaseTransactionRepository } from './supabase-transactions-repository'
import type { ITransactionRepository } from './ITransactionRepository'

// THE swap point for transaction data. Replace this one construction to move to
// an axios/REST backend later; nothing else references the concrete implementation.
export const transactionRepository: ITransactionRepository =
  new SupabaseTransactionRepository()
