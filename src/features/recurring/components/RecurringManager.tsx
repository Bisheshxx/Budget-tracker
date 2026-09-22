import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  useDeactivateRecurring,
  useDeleteRecurring,
  useHasConfirmedHistory,
  useRecurringTransactions,
  useSkipUpcoming,
} from '#/features/recurring/use-recurring'
import { describeSchedule } from '#/features/recurring/schema'
import { nextOccurrenceOnOrAfter } from '#/features/recurring/due'
import { RecurringForm } from '#/features/recurring/components/RecurringForm'
import { useCategoryLookup } from '#/shared/hooks/use-category-lookup'
import { CategoryIcon } from '#/shared/components/CategoryIcon'
import { useProfile } from '#/shared/hooks/use-profile'
import { Money } from '#/shared/components/Money'
import { todayYmd } from '#/shared/lib/period'
import { RecurringRowsSkeleton } from '#/shared/components/skeleton-loaders/RecurringSkeleton'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { RecurringTransaction } from '#/features/recurring/types'
import type { Category } from '#/shared/types/category.type'

// The Recurring screen body: lists the user's templates and drives create, edit,
// deactivate, and (for already-deactivated templates) hard delete. The form lives
// in a dialog; deactivate/delete go through their own confirmation dialog.
export function RecurringManager() {
  const { recurringTransactions, loading } = useRecurringTransactions()
  // null = closed; 'new' = create; a template = edit that one.
  const [formFor, setFormFor] = useState<'new' | RecurringTransaction | null>(
    null,
  )

  const active = recurringTransactions.filter((r) => r.active)
  const inactive = recurringTransactions.filter((r) => !r.active)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recurring transactions</h2>
        <Button onClick={() => setFormFor('new')}>
          <Plus />
          Add Recurring Transaction
        </Button>
      </div>

      {loading ? (
        <RecurringRowsSkeleton />
      ) : recurringTransactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven't set up any recurring transactions yet. Add fixed costs
          like rent or a gym membership, or income like a paycheck, so they post
          automatically when due.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <ul className="flex flex-col divide-y rounded-md border">
            {active.map((rt) => (
              <RecurringRow
                key={rt.id}
                recurringTransaction={rt}
                onEdit={() => setFormFor(rt)}
              />
            ))}
          </ul>

          {inactive.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Deactivated
              </h3>
              <ul className="flex flex-col divide-y rounded-md border opacity-70">
                {inactive.map((rt) => (
                  <RecurringRow key={rt.id} recurringTransaction={rt} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={formFor !== null}
        onOpenChange={(open) => !open && setFormFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formFor === 'new'
                ? 'Add Recurring Transaction'
                : 'Edit Recurring Transaction'}
            </DialogTitle>
            <DialogDescription>
              Fixed commitments that post automatically when they're due.
            </DialogDescription>
          </DialogHeader>
          {formFor !== null && (
            <RecurringForm
              recurringTransaction={formFor === 'new' ? undefined : formFor}
              onSuccess={() => setFormFor(null)}
              onCancel={() => setFormFor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// One template row. Active rows expose Edit + Skip next + Deactivate;
// deactivated rows expose a hard Delete (the explicit, reserved action for
// clearly-wrong templates).
function RecurringRow({
  recurringTransaction: rt,
  onEdit,
}: {
  recurringTransaction: RecurringTransaction
  onEdit?: () => void
}) {
  const { profile } = useProfile()
  const { categoryFor } = useCategoryLookup()
  const deactivate = useDeactivateRecurring()
  const del = useDeleteRecurring()
  const skipUpcoming = useSkipUpcoming()
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { data: hasConfirmedHistory = false } = useHasConfirmedHistory(rt.id)

  const category = categoryFor(rt.categoryId)
  const currency = profile?.currency ?? 'USD'
  const pending = deactivate.isPending || del.isPending
  const nextOccurrence = rt.active
    ? nextOccurrenceOnOrAfter(rt, todayYmd())
    : null

  function ask(action: ConfirmAction) {
    setError(null)
    setConfirm(action)
  }

  async function onConfirm() {
    setError(null)
    try {
      await (confirm === 'delete' ? del : deactivate).mutateAsync(rt.id)
      setConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <CategoryAvatar category={category} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{rt.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {describeSchedule(rt)}
          </p>
          {nextOccurrence && (
            <p className="truncate text-xs text-muted-foreground">
              Next: {nextOccurrence}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Money cents={rt.amountCents} currency={currency} tone={rt.kind} />
        <RecurringRowActions
          recurringTransaction={rt}
          nextOccurrence={nextOccurrence}
          onSkip={() =>
            nextOccurrence &&
            skipUpcoming.mutate({
              recurringTransactionId: rt.id,
              occurrenceDate: nextOccurrence,
            })
          }
          skipPending={skipUpcoming.isPending}
          onEdit={onEdit}
          onAsk={ask}
        />
      </div>

      <ConfirmActionDialog
        action={confirm}
        name={rt.name}
        hasConfirmedHistory={hasConfirmedHistory}
        pending={pending}
        error={error}
        onCancel={() => setConfirm(null)}
        onConfirm={onConfirm}
      />
    </li>
  )
}

// The row's action cluster: Skip next (active rows with a next occurrence),
// Edit (when the row is in the active list), and Deactivate/Delete depending
// on whether the template is still active. Split out of RecurringRow to keep
// its own branching isolated from the row's data display.
function RecurringRowActions({
  recurringTransaction: rt,
  nextOccurrence,
  onSkip,
  skipPending,
  onEdit,
  onAsk,
}: {
  recurringTransaction: RecurringTransaction
  nextOccurrence: string | null
  onSkip: () => void
  skipPending: boolean
  onEdit?: () => void
  onAsk: (action: ConfirmAction) => void
}) {
  return (
    <>
      {rt.active && nextOccurrence && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={skipPending}
        >
          Skip next
        </Button>
      )}
      {onEdit && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${rt.name}`}
          onClick={onEdit}
        >
          <Pencil />
        </Button>
      )}
      {rt.active ? (
        <Button variant="ghost" size="sm" onClick={() => onAsk('deactivate')}>
          Deactivate
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${rt.name}`}
          onClick={() => onAsk('delete')}
        >
          <Trash2 className="text-destructive" />
        </Button>
      )}
    </>
  )
}

// The category's colored circle + icon. Falls back to a neutral muted circle
// while categories load (or if the category was deleted).
function CategoryAvatar({ category }: { category: Category | null }) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted"
      style={category ? { backgroundColor: category.colorHex } : undefined}
    >
      <CategoryIcon
        name={category?.icon ?? null}
        className="size-4 text-white"
      />
    </span>
  )
}

type ConfirmAction = 'deactivate' | 'delete'

// The dialog's title/body copy for the action being confirmed. Split out of
// ConfirmActionDialog so the component itself only has the (isDelete, pending)
// button branching to worry about.
function describeConfirmAction(
  action: ConfirmAction,
  name: string,
  hasConfirmedHistory: boolean,
): { title: string; description: string } {
  if (action === 'delete') {
    return {
      title: `Delete ${name}?`,
      description: hasConfirmedHistory
        ? 'This permanently removes the template. Transactions it already posted are kept, unlinked from the template, and still count in your Cashflow.'
        : 'This permanently removes the template.',
    }
  }
  return {
    title: `Deactivate ${name}?`,
    description:
      "This stops it from posting upcoming occurrences. Its history is kept for your reports — you won't lose any past spending.",
  }
}

// Confirmation dialog for deactivating (history retained) or hard-deleting a
// template. Closed when `action` is null. Kept separate so RecurringRow stays
// focused on the row itself.
function ConfirmActionDialog({
  action,
  name,
  hasConfirmedHistory,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction | null
  name: string
  hasConfirmedHistory: boolean
  pending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const isDelete = action === 'delete'
  const { title, description } = action
    ? describeConfirmAction(action, name, hasConfirmedHistory)
    : { title: '', description: '' }

  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={isDelete ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Working…' : isDelete ? 'Delete' : 'Deactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
