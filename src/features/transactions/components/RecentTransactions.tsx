import { useRecentTransactions } from '#/features/transactions/use-transactions'
import { useProfile } from '#/features/profile/use-profile'
import { useCategories } from '#/features/categories/use-categories'
import { CategoryChip } from '#/features/categories/components/CategoryChip'
import { Money } from '#/shared/components/Money'
import type { Transaction } from '#/features/transactions/types'
import type { Category } from '#/features/categories/types'

// The recent-transactions list. Each row shows the transaction's category
// (resolved client-side from the loaded categories), the note, and the amount.
export function RecentTransactions() {
  const { transactions, loading } = useRecentTransactions()
  const { categories, loading: categoriesLoading } = useCategories()
  const { profile } = useProfile()
  const currency = profile?.currency ?? 'USD'

  // Resolve a transaction's category to a real row. A null category_id falls
  // back to the seeded Uncategorized system category — never a hardcoded string.
  const byId = new Map(categories.map((c) => [c.id, c]))
  const uncategorized =
    categories.find((c) => c.isSystem && c.name === 'Uncategorized') ?? null
  const categoryFor = (tx: Transaction): Category | null =>
    tx.categoryId ? (byId.get(tx.categoryId) ?? uncategorized) : uncategorized

  if (loading || categoriesLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No transactions yet — add your first one above.
      </p>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {transactions.map((tx) => (
        <TransactionRow
          key={tx.id}
          tx={tx}
          category={categoryFor(tx)}
          currency={currency}
        />
      ))}
    </ul>
  )
}

function TransactionRow({
  tx,
  category,
  currency,
}: {
  tx: Transaction
  category: Category | null
  currency: string
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <CategoryChip category={category} className="font-medium" />
        <p className="truncate text-xs text-muted-foreground">
          {tx.transactionDate}
          {tx.note ? ` · ${tx.note}` : ''}
        </p>
      </div>
      <Money
        cents={tx.type === 'expense' ? -tx.amountCents : tx.amountCents}
        currency={currency}
        tone={tx.type}
        signed
        className="font-semibold"
      />
    </li>
  )
}
