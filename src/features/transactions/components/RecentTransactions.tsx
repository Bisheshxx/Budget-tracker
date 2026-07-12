import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  useDeleteTransaction,
  useTransactionsInfinite,
} from '#/features/transactions/use-transactions'
import {
  groupByDay,
  formatDayLabel,
} from '#/features/transactions/group-by-day'
import { rangeToBounds } from '#/features/transactions/range'
import type { Range } from '#/features/transactions/range'
import { useProfile } from '#/features/profile/use-profile'
import { useCategoryLookup } from '#/features/categories/use-category-lookup'
import { CategoryChip } from '#/features/categories/components/CategoryChip'
import { Money } from '#/shared/components/Money'
import { Dialog } from '#/shared/components/Dialog'
import { useDialog } from '#/shared/hooks/use-dialog'
import { DIALOG } from '#/shared/stores/ui-store'
import { Button } from '#/components/ui/button'
import { todayYmd } from '#/shared/lib/period'
import type { Transaction } from '#/features/transactions/types'
import type { Category } from '#/features/categories/types'

// Map an inclusive Range to the infinite-list hook's half-open {from, to}
// window (the single +1-day conversion lives in rangeToBounds), or undefined for
// no Range — which the hook falls back to the current Period.
function rangeToHookBounds(range: Range | null | undefined) {
  if (!range) return undefined
  const { start, end } = rangeToBounds(range)
  return { from: start, to: end }
}

// Observe a bottom sentinel and load the next page when it scrolls into view.
// Returns the ref to attach to the sentinel element. Kept out of the list
// component so its render body stays declarative.
function useInfiniteScrollSentinel(
  onLoadMore: () => void,
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) onLoadMore()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, onLoadMore])
  return sentinelRef
}

// The Dashboard transaction list: keyset-paginated infinite scroll, segmented
// into per-day groups with a divider per calendar day (date label + that day's
// net). Each row shows the transaction's category, note, and amount; edit
// (pencil) and delete (trash) buttons reveal on row hover/focus — edit opens the
// edit dialog, delete goes through a confirm modal. Defaults to the current
// Period; when a `range` is active (PRD B) it re-scopes to that arbitrary span
// so the list matches the "This Period" card above it.
export function RecentTransactions({
  range,
  onEdit,
}: {
  range?: Range | null
  onEdit?: (tx: Transaction) => void
}) {
  const {
    transactions,
    loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useTransactionsInfinite(rangeToHookBounds(range))
  const { categoryFor, loading: categoriesLoading } = useCategoryLookup()
  const { profile } = useProfile()
  const confirmDelete = useDialog(DIALOG.confirmDeleteTransaction)
  const currency = profile?.currency ?? 'USD'
  // The transaction queued for the confirm modal.
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null)
  // Fetch the next page when the bottom sentinel scrolls into view.
  const sentinelRef = useInfiniteScrollSentinel(
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  )

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

  const today = todayYmd()
  const days = groupByDay(transactions)

  return (
    <>
      <div className="flex flex-col gap-4">
        {days.map((day) => (
          <div key={day.date}>
            <div className="mb-1 flex items-baseline justify-between border-b border-border pb-1">
              <h3 className="text-sm font-semibold">
                {formatDayLabel(day.date, today)}
              </h3>
              <Money
                cents={day.netCents}
                currency={currency}
                tone={day.netCents >= 0 ? 'income' : 'expense'}
                signed
                className="text-xs font-medium"
              />
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {day.transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  category={categoryFor(tx.categoryId)}
                  currency={currency}
                  onEdit={onEdit}
                  onRequestDelete={() => {
                    setPendingDelete(tx)
                    confirmDelete.open()
                  }}
                />
              ))}
            </ul>
          </div>
        ))}

        {/* Sentinel drives infinite scroll; the loader shows while a page loads. */}
        <div ref={sentinelRef} aria-hidden />
        {isFetchingNextPage && (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        )}
      </div>

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
          {tx.note && (
            <p className="truncate text-xs text-muted-foreground">{tx.note}</p>
          )}
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
