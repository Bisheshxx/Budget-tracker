import { useState } from 'react'
import {
  useConfirmDue,
  useDueRecurring,
  useSkipDue,
} from '#/features/recurring/use-recurring'
import { QuickAddForm } from '#/features/transactions/components/QuickAddForm'
import { useProfile } from '#/features/profile/use-profile'
import { fromCents } from '#/lib/money'
import { Money } from '#/shared/components/Money'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { QuickAddFormValues } from '#/features/transactions/schema'
import type { DueOccurrence } from '#/features/recurring/types'

// Seed the confirm form from a Due item: the template's default amount (cents →
// display units), its category, and the Due date — all editable before saving.
function dueToFormValues(due: DueOccurrence): QuickAddFormValues {
  return {
    amount: String(fromCents(due.recurringExpense.amountCents)),
    type: 'expense',
    categoryId: due.recurringExpense.categoryId,
    transactionDate: due.occurrenceDate,
    note: '',
  }
}

// Dashboard "Due now" prompt: the Recurring Expenses that have come due this
// Period and aren't resolved yet. Renders nothing when nothing is due. Confirm
// opens a pre-filled, editable expense (amount + date editable); Skip dismisses
// the occurrence for this window.
export function DueNow() {
  const { due, loading } = useDueRecurring()
  const { profile } = useProfile()
  const skip = useSkipDue()
  const confirmDue = useConfirmDue()
  const [confirming, setConfirming] = useState<DueOccurrence | null>(null)

  // Quietly absent until there's something to prompt for — no empty card.
  if (loading || due.length === 0) return null

  const currency = profile?.currency ?? 'USD'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Due now</CardTitle>
        <CardDescription>
          Recurring expenses to confirm. The amount and date stay editable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {due.map((item) => (
            <li
              key={`${item.recurringExpense.id}|${item.occurrenceDate}`}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {item.recurringExpense.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Due {item.occurrenceDate}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Money
                  cents={item.recurringExpense.amountCents}
                  currency={currency}
                  tone="expense"
                />
                <Button size="sm" onClick={() => setConfirming(item)}>
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => skip.mutate(item)}
                  disabled={skip.isPending}
                >
                  Skip
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {confirming?.recurringExpense.name}
            </DialogTitle>
            <DialogDescription>
              Saving records this as an expense and counts it in your Cashflow.
            </DialogDescription>
          </DialogHeader>
          {confirming && (
            <QuickAddForm
              defaultValues={dueToFormValues(confirming)}
              submitLabel="Confirm expense"
              onConfirm={(values) =>
                confirmDue.mutateAsync({ due: confirming, input: values })
              }
              onSuccess={() => setConfirming(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
