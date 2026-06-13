// Domain types owned by the transactions feature — the vocabulary the service,
// hooks, components, and the repository port all speak. The persistence port
// that traffics in these lives in #/data/transactions/ITransactionRepository.
// See docs/adr/0004.

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  /** References user_profiles.id (NOT the auth user id). */
  userId: string
  /** Null = Uncategorized (the category picker lands in issue 04). */
  categoryId: string | null
  type: TransactionType
  /** Stored as integer cents. */
  amountCents: number
  note: string | null
  /** SQL date as 'YYYY-MM-DD'. */
  transactionDate: string
  createdAt: string
}

// The fields a create writes. Money is in cents; id/createdAt are DB-assigned.
export interface TransactionCreate {
  userId: string
  categoryId: string | null
  type: TransactionType
  amountCents: number
  note: string | null
  transactionDate: string
}
