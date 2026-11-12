import { recurringTransactionRepository } from '#/data/recurring'
import { transactionRepository } from '#/data/transactions'
import { RecurringService } from './recurring-service'

// Composition root for the recurring feature: the app-wide RecurringService
// singleton, wired to the active repositories. Auto-posting a Due occurrence
// creates a transaction, so the service also depends on the transaction
// repository.
// The backend behind it is chosen in src/data/index.ts (docs/adr/0011) —
// nothing here changes on a swap.
export const recurringService = new RecurringService(
  recurringTransactionRepository,
  transactionRepository,
)
