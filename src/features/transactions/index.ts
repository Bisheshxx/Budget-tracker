import { transactionRepository } from '#/data/transactions'
import { TransactionService } from '#/features/transactions/services/transaction-service'

// Composition root for the transactions feature: the app-wide
// TransactionService singleton, wired to the active repository.
// The backend behind it is chosen in src/data/index.ts (docs/adr/0011) —
// nothing here changes on a swap.
export const transactionService = new TransactionService(transactionRepository)
