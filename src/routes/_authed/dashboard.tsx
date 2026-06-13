import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '#/features/auth/auth-context'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Dialog } from '#/shared/components/Dialog'
import { useDialog } from '#/shared/hooks/use-dialog'
import { DIALOG } from '#/shared/stores/ui-store'
import { QuickAddForm } from '#/features/transactions/components/QuickAddForm'
import { CashflowSummary } from '#/features/transactions/components/CashflowSummary'
import { RecentTransactions } from '#/features/transactions/components/RecentTransactions'
import { CategoryCreateForm } from '#/features/categories/components/CategoryCreateForm'
import { CategoryManager } from '#/features/categories/components/CategoryManager'
import type { QuickAddFormValues } from '#/features/transactions/schema'
import type { Transaction } from '#/features/transactions/types'

// Protected shell: the current-Period Cashflow summary (issue 05) plus
// quick-add + recent list (issue 03).
export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
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
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

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

  async function onSignOut() {
    if (signingOut) return
    setError(null)
    setSigningOut(true)
    try {
      await signOut()
      await navigate({ to: '/login', replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign out')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button variant="outline" onClick={onSignOut} disabled={signingOut}>
          {signingOut ? 'Logging out…' : 'Log out'}
        </Button>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <p className="mt-4 text-muted-foreground">
        You're signed in as {session?.user.email ?? 'your account'}.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <CashflowSummary />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent transactions</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={manageCategories.open}>
                Categories
              </Button>
              <Button onClick={openQuickAdd}>Add transaction</Button>
            </div>
          </CardHeader>
          <CardContent>
            <RecentTransactions onEdit={openEdit} />
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
