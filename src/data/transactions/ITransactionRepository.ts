import type {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
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
  /** Update an existing transaction's editable fields; returns the saved row. */
  update: (id: string, input: TransactionUpdate) => Promise<Transaction>
  /** Delete a transaction by id. RLS scopes the row to the owning user. */
  delete: (id: string) => Promise<void>
}
