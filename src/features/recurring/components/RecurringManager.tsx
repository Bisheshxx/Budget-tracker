import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  useDeactivateRecurring,
  useDeleteRecurring,
  useRecurringExpenses,
} from '#/features/recurring/use-recurring'
import { describeSchedule } from '#/features/recurring/schema'
import { RecurringForm } from '#/features/recurring/components/RecurringForm'
import { useCategoryLookup } from '#/features/categories/use-category-lookup'
import { CategoryIcon } from '#/features/categories/CategoryIcon'
import { useProfile } from '#/features/profile/use-profile'
import { Money } from '#/shared/components/Money'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { RecurringExpense } from '#/features/recurring/types'
import type { Category } from '#/features/categories/types'

// The Recurring screen body: lists the user's templates and drives create, edit,
// deactivate, and (for already-deactivated templates) hard delete. The form lives
// in a dialog; deactivate/delete go through their own confirmation dialog.
export function RecurringManager() {
  const { recurringExpenses, loading } = useRecurringExpenses()
  // null = closed; 'new' = create; a template = edit that one.
  const [formFor, setFormFor] = useState<'new' | RecurringExpense | null>(null)

  const active = recurringExpenses.filter((r) => r.active)
  const inactive = recurringExpenses.filter((r) => !r.active)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recurring expenses</h2>
        <Button onClick={() => setFormFor('new')}>
          <Plus />
          Add Recurring Expense
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : recurringExpenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven't set up any recurring expenses yet. Add fixed costs like
          rent or a gym membership so logging them is one tap.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <ul className="flex flex-col divide-y rounded-md border">
            {active.map((re) => (
              <RecurringRow
                key={re.id}
                recurringExpense={re}
                onEdit={() => setFormFor(re)}
              />
            ))}
          </ul>

          {inactive.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Deactivated
              </h3>
              <ul className="flex flex-col divide-y rounded-md border opacity-70">
                {inactive.map((re) => (
                  <RecurringRow key={re.id} recurringExpense={re} />
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
                ? 'Add Recurring Expense'
                : 'Edit Recurring Expense'}
            </DialogTitle>
            <DialogDescription>
              Fixed commitments you'll be prompted to confirm when they're due.
            </DialogDescription>
          </DialogHeader>
          {formFor !== null && (
            <RecurringForm
              recurringExpense={formFor === 'new' ? undefined : formFor}
              onSuccess={() => setFormFor(null)}
              onCancel={() => setFormFor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// One template row. Active rows expose Edit + Deactivate; deactivated rows expose
// a hard Delete (the explicit, reserved action for clearly-wrong templates).
function RecurringRow({
  recurringExpense: re,
  onEdit,
}: {
  recurringExpense: RecurringExpense
  onEdit?: () => void
}) {
  const { profile } = useProfile()
  const { categoryFor } = useCategoryLookup()
  const deactivate = useDeactivateRecurring()
  const del = useDeleteRecurring()
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  const category = categoryFor(re.categoryId)
  const currency = profile?.currency ?? 'USD'
  const pending = deactivate.isPending || del.isPending

  function ask(action: ConfirmAction) {
    setError(null)
    setConfirm(action)
  }

  async function onConfirm() {
    setError(null)
    try {
      await (confirm === 'delete' ? del : deactivate).mutateAsync(re.id)
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
          <p className="truncate text-sm font-medium">{re.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {describeSchedule(re)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Money cents={re.amountCents} currency={currency} tone="expense" />
        {onEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${re.name}`}
            onClick={onEdit}
          >
            <Pencil />
          </Button>
        )}
        {re.active ? (
          <Button variant="ghost" size="sm" onClick={() => ask('deactivate')}>
            Deactivate
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${re.name}`}
            onClick={() => ask('delete')}
          >
            <Trash2 className="text-destructive" />
          </Button>
        )}
      </div>

      <ConfirmActionDialog
        action={confirm}
        name={re.name}
        pending={pending}
        error={error}
        onCancel={() => setConfirm(null)}
        onConfirm={onConfirm}
      />
    </li>
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

// Confirmation dialog for deactivating (history retained) or hard-deleting a
// template. Closed when `action` is null. Kept separate so RecurringRow stays
// focused on the row itself.
function ConfirmActionDialog({
  action,
  name,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction | null
  name: string
  pending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const isDelete = action === 'delete'

  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isDelete ? `Delete ${name}?` : `Deactivate ${name}?`}
          </DialogTitle>
          <DialogDescription>
            {isDelete
              ? 'This permanently removes the template. Transactions you already confirmed are kept and still count in your Cashflow.'
              : "This stops prompting you to confirm upcoming occurrences. Its history is kept for your reports — you won't lose any past spending."}
          </DialogDescription>
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
