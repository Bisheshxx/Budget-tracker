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

// Expense spend for one category within a Period (the spend-by-category
// breakdown). `categoryId` null = Uncategorized. Income is excluded — this
// answers "where did my money go".
export interface CategorySpend {
  categoryId: string | null
  amountCents: number
}

// The current Period's Cashflow at a glance: totals plus the expense breakdown.
// All amounts are integer cents (see #/lib/money). Net = income − expenses.
export interface PeriodSummary {
  incomeCents: number
  expensesCents: number
  netCents: number
  /** Expense spend per category, most-spent first. */
  byCategory: CategorySpend[]
}

// The fields a create writes. Money is in cents; id/createdAt are DB-assigned.
export interface TransactionCreate {
  userId: string
  categoryId: string | null
  type: TransactionType
  amountCents: number
  note: string | null
  transactionDate: string
  /**
   * Links this transaction to the Recurring Expense it confirmed (see ADR 0006);
   * omitted/null for ordinary transactions. "Recurring" is derived from this FK.
   */
  recurringExpenseId?: string | null
}

// The editable fields an update writes. The id targets the row (passed
// separately); userId/createdAt never change so they're omitted. Money is in
// cents, mirroring TransactionCreate.
export interface TransactionUpdate {
  categoryId: string | null
  type: TransactionType
  amountCents: number
  note: string | null
  transactionDate: string
}
