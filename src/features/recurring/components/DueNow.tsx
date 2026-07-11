import { useState } from 'react'
import {
  useConfirmAllDue,
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
  const confirmAllDue = useConfirmAllDue()
  const [confirming, setConfirming] = useState<DueOccurrence | null>(null)

  // Quietly absent until there's something to prompt for — no empty card.
  if (loading || due.length === 0) return null

  const currency = profile?.currency ?? 'USD'
  const groups = groupDue(due)

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
          {groups.map((group) => (
            <li key={group.recurringExpense.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {group.recurringExpense.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {group.items.length === 1
                      ? `Due ${group.items[0].occurrenceDate}`
                      : `${group.items.length} due from ${group.items[0].occurrenceDate} to ${group.items[group.items.length - 1].occurrenceDate}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Money
                    cents={
                      group.recurringExpense.amountCents * group.items.length
                    }
                    currency={currency}
                    tone="expense"
                  />
                  <Button
                    size="sm"
                    onClick={() => confirmAllDue.mutate(group.items)}
                    disabled={confirmAllDue.isPending}
                  >
                    Accept all
                  </Button>
                </div>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {group.items.map((item) => (
                  <li
                    key={`${item.recurringExpense.id}|${item.occurrenceDate}`}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2"
                  >
                    <span className="text-xs text-muted-foreground">
                      {item.occurrenceDate}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => setConfirming(item)}>
                        Review
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

function groupDue(due: DueOccurrence[]) {
  const byTemplate = new Map<
    string,
    {
      recurringExpense: DueOccurrence['recurringExpense']
      items: DueOccurrence[]
    }
  >()

  for (const item of due) {
    const group = byTemplate.get(item.recurringExpense.id)
    if (group) group.items.push(item)
    else {
      byTemplate.set(item.recurringExpense.id, {
        recurringExpense: item.recurringExpense,
        items: [item],
      })
    }
  }

  return Array.from(byTemplate.values())
}
