import { useRecentTransactions } from '#/features/transactions/use-transactions'
import { useProfile } from '#/features/profile/use-profile'
import { Money } from '#/shared/components/Money'
import type { Transaction } from '#/features/transactions/types'

// The recent-transactions list. Categories arrive in issue 04, so every row
// currently reads as "Uncategorized".
export function RecentTransactions() {
  const { transactions, loading } = useRecentTransactions()
  const { profile } = useProfile()
  const currency = profile?.currency ?? 'USD'

  if (loading) {
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
        <TransactionRow key={tx.id} tx={tx} currency={currency} />
      ))}
    </ul>
  )
}

function TransactionRow({
  tx,
  currency,
}: {
  tx: Transaction
  currency: string
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{tx.note || 'Uncategorized'}</p>
        <p className="text-xs text-muted-foreground">{tx.transactionDate}</p>
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
