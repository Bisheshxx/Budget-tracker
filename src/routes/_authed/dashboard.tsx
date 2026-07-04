import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog } from '#/shared/components/Dialog'
import { useDialog } from '#/shared/hooks/use-dialog'
import { DIALOG } from '#/shared/stores/ui-store'
import { QuickAddForm } from '#/features/transactions/components/QuickAddForm'
import { CashflowSummary } from '#/features/transactions/components/CashflowSummary'
import { RangeFilter } from '#/features/transactions/components/RangeFilter'
import { RecentTransactions } from '#/features/transactions/components/RecentTransactions'
import { DueNow } from '#/features/recurring/components/DueNow'
import { CategoryCreateForm } from '#/features/categories/components/CategoryCreateForm'
import { CategoryManager } from '#/features/categories/components/CategoryManager'
import { rangeSearchSchema } from '#/features/transactions/schema'
import {
  formatRangeLabel,
  searchToRange,
} from '#/features/transactions/range'
import type { QuickAddFormValues } from '#/features/transactions/schema'
import type { Transaction } from '#/features/transactions/types'

// Protected shell: the Cashflow summary (issue 05) plus quick-add + recent list
// (issue 03). `?from=&to=` re-scopes the summary card and the list to a Range
// (PRD B); absent/invalid params leave both on the current Period.
export const Route = createFileRoute('/_authed/dashboard')({
  validateSearch: (search) => rangeSearchSchema.parse(search),
  component: DashboardPage,
})

function DashboardPage() {
  // One Range drives both the card and the list below it; searchToRange owns
  // the "active only when both ends resolved and not inverted" rule.
  const { from, to } = Route.useSearch()
  const activeRange = searchToRange(from, to)

  const quickAdd = useDialog(DIALOG.quickAdd)
  const editTransaction = useDialog(DIALOG.editTransaction)
  const createCategory = useDialog(DIALOG.createCategory)
  const manageCategories = useDialog(DIALOG.manageCategories)
  // Draft preserves the in-progress transaction across the create-category dialog
  // swap (the add/edit form unmounts while the category dialog is open).
  const [draft, setDraft] = useState<QuickAddFormValues | null>(null)
  // The transaction being edited; null means the quick-add (create) flow. Also
  // decides which dialog the create-category swap returns to.
  const [editing, setEditing] = useState<Transaction | null>(null)

  function openQuickAdd() {
    setDraft(null)
    setEditing(null)
    quickAdd.open()
  }

  function openEdit(tx: Transaction) {
    setDraft(null)
    setEditing(tx)
    editTransaction.open()
  }

  // After creating a category mid-edit/add, reopen whichever form was active.
  function reopenTransactionForm() {
    if (editing) editTransaction.open()
    else quickAdd.open()
  }

  return (
    <main className="mx-auto w-full max-w-[98.5rem] px-4 py-6 lg:py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      {/* On lg+ the dashboard pins to the viewport: the grid fills the space
          below the header and each column scrolls on its own, so the page
          itself doesn't scroll. Below lg it falls back to a single stacked
          column with normal page scroll. The offset roughly accounts for the
          header + this section's vertical padding + the title row. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:h-[calc(100dvh-260px)] lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-5 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <CashflowSummary range={activeRange} />
          <DueNow />
          {/* Actions panel — quick-add + category management. */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Range filter (PRD B): re-scopes the Cashflow card + list to an
                  arbitrary span via the URL. Lives here in Actions. */}
              <RangeFilter range={activeRange} />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={openQuickAdd}>
                  Add transaction
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={manageCategories.open}
                >
                  Categories
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="flex min-h-0 flex-col lg:col-span-7">
          <CardHeader>
            {/* Heading mirrors the card above: the Range when active, else the
                default recent-transactions title. */}
            <CardTitle>
              {activeRange
                ? formatRangeLabel(activeRange)
                : 'Recent transactions'}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto">
            <RecentTransactions range={activeRange} onEdit={openEdit} />
          </CardContent>
        </Card>
      </div>

      <Dialog name={DIALOG.quickAdd} title="Add transaction">
        <QuickAddForm
          defaultValues={draft ?? undefined}
          onSuccess={() => {
            setDraft(null)
            quickAdd.close()
          }}
          onCreateCategory={(current) => {
            // Stash the in-progress transaction, then swap to the category dialog
            // (opening it closes quick-add via the single-active store).
            setDraft(current)
            createCategory.open()
          }}
        />
      </Dialog>

      <Dialog name={DIALOG.editTransaction} title="Edit transaction">
        {editing && (
          <QuickAddForm
            transaction={editing}
            defaultValues={draft ?? undefined}
            onSuccess={() => {
              setDraft(null)
              setEditing(null)
              editTransaction.close()
            }}
            onCreateCategory={(current) => {
              setDraft(current)
              createCategory.open()
            }}
          />
        )}
      </Dialog>

      <Dialog name={DIALOG.createCategory} title="New category">
        <CategoryCreateForm
          onSuccess={(category) => {
            // Restore the draft with the new category pre-selected, then reopen
            // whichever form (add/edit) was active. The draft was stashed in
            // onCreateCategory before this dialog opened, so it must exist here.
            setDraft((d) => {
              if (!d) throw new Error('expected a stashed transaction draft')
              return { ...d, categoryId: category.id }
            })
            reopenTransactionForm()
          }}
          onCancel={reopenTransactionForm}
        />
      </Dialog>

      <Dialog name={DIALOG.manageCategories} title="Categories">
        <CategoryManager />
      </Dialog>
    </main>
  )
}
