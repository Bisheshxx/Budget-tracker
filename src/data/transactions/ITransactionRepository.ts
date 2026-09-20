import type {
  Transaction,
  TransactionCreate,
  TransactionPageParams,
  TransactionUpdate,
} from '#/shared/types/transaction.type'

export interface ITransactionRepository {
  /**
   * One keyset-paginated page, newest-first by (transactionDate, id). Returns at
   * most `params.limit` rows within the optional half-open [from, to) window; a
   * page shorter than `limit` is the last one. Pass the previous page's last row
   * as `params.cursor` to fetch the next page. Powers the Dashboard's
   * infinite-scroll list.
   */
  listPage: (
    userId: string,
    params: TransactionPageParams,
  ) => Promise<Transaction[]>
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
  /**
   * Create the auto-posted transaction for a recurring occurrence, or return
   * the existing one if this exact (recurringTransactionId, transactionDate)
   * slot was already posted — by a concurrent reconcile call or a prior one.
   * Conflict-safe via a DB unique constraint, so callers never need to detect
   * "who won" or clean up an orphan themselves. `input.recurringTransactionId`
   * must be set.
   */
  createForRecurringOccurrence: (input: TransactionCreate) => Promise<Transaction>
  /** Update an existing transaction's editable fields; returns the saved row. */
  update: (id: string, input: TransactionUpdate) => Promise<Transaction>
  /** Delete a transaction by id. RLS scopes the row to the owning user. */
  delete: (id: string) => Promise<void>
}
