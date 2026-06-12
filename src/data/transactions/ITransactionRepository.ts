import type {
  Transaction,
  TransactionCreate,
} from '#/features/transactions/types'

export interface ITransactionRepository {
  /** Most-recent-first, capped at `limit`. */
  listRecent: (userId: string, limit: number) => Promise<Transaction[]>
  create: (input: TransactionCreate) => Promise<Transaction>
}
