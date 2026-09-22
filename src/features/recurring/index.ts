import { recurringTransactionRepository } from '#/data/recurring'
import { transactionRepository } from '#/data/transactions'
import { RecurringService } from './recurring-service'

// Composition root for the recurring feature: the app-wide RecurringService
// singleton, wired to the active repositories. Auto-posting a Due occurrence
// creates a transaction, so the service also depends on the transaction
// repository. Swap the repositories in #/data/* to move off Supabase.
export const recurringService = new RecurringService(
  recurringTransactionRepository,
  transactionRepository,
)
