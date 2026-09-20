import { useState } from 'react'
import {
  useAutoReconcile,
  useRecentlyPosted,
  useSkipDue,
} from '#/features/recurring/use-recurring'
import { QuickAddForm } from '#/shared/components/QuickAddForm'
import { useProfile } from '#/shared/hooks/use-profile'
import { useDialog } from '#/shared/hooks/use-dialog'
import { DIALOG } from '#/shared/stores/ui-store'
import { Dialog as StoreDialog } from '#/shared/components/Dialog'
import { Money } from '#/shared/components/Money'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import type { RecentlyPostedItem } from '#/data/recurring/IRecurringTransactionRepository'
import type { Transaction } from '#/shared/types/transaction.type'

// Dashboard "Recently posted" card: recurring occurrences reconcileDue has
// auto-posted this Period. Nothing needs confirming — this is purely
// informational, with a quick Edit (amount/date correction) and Undo (delete
// the posted transaction, flip the occurrence back to skipped) per row. Also
// owns triggering reconcileDue itself, so importing this component is the only
// wiring the Dashboard needs. Renders nothing while nothing has posted.
export function RecentlyPosted() {
  useAutoReconcile()
  const { items, loading } = useRecentlyPosted()
  const { profile } = useProfile()
  const editDialog = useDialog(DIALOG.editRecentlyPosted)
  const undoDialog = useDialog(DIALOG.confirmUndoRecurring)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [pendingUndo, setPendingUndo] = useState<RecentlyPostedItem | null>(
    null,
  )

  // Quietly absent until there's something to show — no empty card.
  if (loading || items.length === 0) return null

  const currency = profile?.currency ?? 'USD'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently posted</CardTitle>
        <CardDescription>
          Recurring transactions auto-posted this Period. Edit if the amount or
          date needs a correction, or Undo to remove one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {items.map((item) => (
            <li
              key={item.occurrence.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {item.recurringTransaction.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.recurringTransaction.kind === 'income'
                    ? 'Income'
                    : 'Expense'}{' '}
                  · {item.occurrence.occurrenceDate}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Money
                  cents={item.transaction.amountCents}
                  currency={currency}
                  tone={item.recurringTransaction.kind}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(item.transaction)
                    editDialog.open()
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPendingUndo(item)
                    undoDialog.open()
                  }}
                >
                  Undo
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <StoreDialog name={DIALOG.editRecentlyPosted} title="Edit transaction">
        {editing && (
          <QuickAddForm
            transaction={editing}
            onSuccess={() => {
              setEditing(null)
              editDialog.close()
            }}
          />
        )}
      </StoreDialog>

      <ConfirmUndoDialog
        item={pendingUndo}
        onClose={() => setPendingUndo(null)}
      />
    </Card>
  )
}

// Undo deletes a real transaction (unlike the old no-confirm skip, which never
// created one), so it goes through a confirm step.
function ConfirmUndoDialog({
  item,
  onClose,
}: {
  item: RecentlyPostedItem | null
  onClose: () => void
}) {
  const skip = useSkipDue()
  const { close } = useDialog(DIALOG.confirmUndoRecurring)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    if (!item) return
    setError(null)
    try {
      await skip.mutateAsync(item.occurrence)
      onClose()
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not undo this')
    }
  }

  return (
    <StoreDialog
      name={DIALOG.confirmUndoRecurring}
      title={item ? `Undo ${item.recurringTransaction.name}?` : 'Undo?'}
      description="This deletes the transaction it posted. It won't post again for this date unless you edit the template."
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={skip.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={skip.isPending}
          >
            {skip.isPending ? 'Undoing…' : 'Undo'}
          </Button>
        </div>
      </div>
    </StoreDialog>
  )
}
