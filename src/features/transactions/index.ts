import { transactionRepository } from '#/data/transactions'
import { TransactionService } from './transaction-service'

// Composition root for the transactions feature: the app-wide
// TransactionService singleton, wired to the active repository. Swap the
// repository in #/data/transactions to move off Supabase.
export const transactionService = new TransactionService(transactionRepository)
