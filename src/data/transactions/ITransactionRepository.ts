import type {
  Transaction,
  TransactionCreate,
} from '#/features/transactions/types'

export interface ITransactionRepository {
  /** Most-recent-first, capped at `limit`. */
  listRecent: (userId: string, limit: number) => Promise<Transaction[]>
  /**
   * All of the user's transactions whose `transactionDate` falls in the
   * half-open range [startInclusive, endExclusive) — the Period query that
   * feeds the Cashflow summary.
   */
  listInRange: (
    userId: string,
    startInclusive: string,
    endExclusive: string,
  ) => Promise<Transaction[]>
  create: (input: TransactionCreate) => Promise<Transaction>
}
