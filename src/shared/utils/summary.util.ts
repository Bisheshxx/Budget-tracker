// Pure transaction-rollup math — no React, no I/O. Totals a list of transactions
// into income/expenses/net plus expense spend-by-category. Lives in shared (not a
// feature service) so it is unit-testable and reusable: the Dashboard's Cashflow
// summary, the data layer's Reports repository, and the Reports Period Comparison
// all build on it, so the three never drift in how a Period is totalled. All
// arithmetic is on integer cents.

import type { PeriodSummary, Transaction } from '#/shared/types/transaction.type'

export function rollup(transactions: Transaction[]): PeriodSummary {
  let incomeCents = 0
  let expensesCents = 0
  // Map keyed by categoryId (null = Uncategorized) so equal ids accumulate.
  const spendByCategory = new Map<string | null, number>()

  for (const tx of transactions) {
    if (tx.type === 'income') {
      incomeCents += tx.amountCents
    } else {
      expensesCents += tx.amountCents
      spendByCategory.set(
        tx.categoryId,
        (spendByCategory.get(tx.categoryId) ?? 0) + tx.amountCents,
      )
    }
  }

  const byCategory = Array.from(
    spendByCategory,
    ([categoryId, amountCents]) => ({
      categoryId,
      amountCents,
    }),
  ).sort((a, b) => b.amountCents - a.amountCents)

  return {
    incomeCents,
    expensesCents,
    netCents: incomeCents - expensesCents,
    byCategory,
  }
}
