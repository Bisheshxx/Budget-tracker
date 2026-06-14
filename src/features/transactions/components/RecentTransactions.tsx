import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  useDeleteTransaction,
  useRecentTransactions,
} from '#/features/transactions/use-transactions'
import { useProfile } from '#/features/profile/use-profile'
import { useCategories } from '#/features/categories/use-categories'
import { CategoryChip } from '#/features/categories/components/CategoryChip'
import { Money } from '#/shared/components/Money'
import { Dialog } from '#/shared/components/Dialog'
import { useDialog } from '#/shared/hooks/use-dialog'
import { DIALOG } from '#/shared/stores/ui-store'
import { Button } from '#/components/ui/button'
import type { Transaction } from '#/features/transactions/types'
import type { Category } from '#/features/categories/types'

// Resolve a transaction's category to a real row. A null category_id falls back
// to the seeded Uncategorized system category — never a hardcoded string.
function useCategoryResolver() {
  const { categories, loading } = useCategories()
  const byId = new Map(categories.map((c) => [c.id, c]))
  const uncategorized =
    categories.find((c) => c.isSystem && c.name === 'Uncategorized') ?? null
  const resolve = (tx: Transaction): Category | null =>
    tx.categoryId ? (byId.get(tx.categoryId) ?? uncategorized) : uncategorized
  return { resolve, loading }
}

// The recent-transactions list. Each row shows the transaction's category, the
// note, and the amount. Edit (pencil) and delete (trash) buttons are revealed on
// row hover/focus — edit opens the edit dialog, delete goes through a confirm
// modal.
export function RecentTransactions({
  onEdit,
}: {
  onEdit?: (tx: Transaction) => void
}) {
  const { transactions, loading } = useRecentTransactions()
  const { resolve, loading: categoriesLoading } = useCategoryResolver()
  const { profile } = useProfile()
  const confirmDelete = useDialog(DIALOG.confirmDeleteTransaction)
  const currency = profile?.currency ?? 'USD'
  // The transaction queued for the confirm modal.
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null)

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
    <>
      <ul className="flex flex-col divide-y divide-border">
        {transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            category={resolve(tx)}
            currency={currency}
            onEdit={onEdit}
            onRequestDelete={() => {
              setPendingDelete(tx)
              confirmDelete.open()
            }}
          />
        ))}
      </ul>

      <ConfirmDeleteDialog
        transaction={pendingDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}

// The delete-confirmation modal. Owns the delete mutation and its error state so
// the list component stays declarative.
function ConfirmDeleteDialog({
  transaction,
  onClose,
}: {
  transaction: Transaction | null
  onClose: () => void
}) {
  const deleteTransaction = useDeleteTransaction()
  const { close } = useDialog(DIALOG.confirmDeleteTransaction)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    if (!transaction) return
    setError(null)
    try {
      await deleteTransaction.mutateAsync(transaction.id)
      onClose()
      close()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete the transaction',
      )
    }
  }

  return (
    <Dialog
      name={DIALOG.confirmDeleteTransaction}
      title="Delete transaction?"
      description="This can't be undone."
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={close}
            disabled={deleteTransaction.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleteTransaction.isPending}
          >
            {deleteTransaction.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

function TransactionRow({
  tx,
  category,
  currency,
  onEdit,
  onRequestDelete,
}: {
  tx: Transaction
  category: Category | null
  currency: string
  onEdit?: (tx: Transaction) => void
  onRequestDelete: () => void
}) {
  return (
    <li className="group flex items-center gap-2 py-3">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
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
      </div>

      {/* Hidden until the row is hovered; still reachable via keyboard focus. */}
      <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit transaction from ${tx.transactionDate}`}
            onClick={() => onEdit(tx)}
          >
            <Pencil />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete transaction from ${tx.transactionDate}`}
          onClick={onRequestDelete}
        >
          <Trash2 className="text-destructive" />
        </Button>
      </span>
    </li>
  )
}
