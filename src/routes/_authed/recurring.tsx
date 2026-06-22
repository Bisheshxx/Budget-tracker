import { createFileRoute } from '@tanstack/react-router'
import { RecurringManager } from '#/features/recurring/components/RecurringManager'

// Protected (nested under _authed, so session + onboarding are already
// guaranteed). Manage Recurring Expense templates — create, edit, deactivate.
export const Route = createFileRoute('/_authed/recurring')({
  component: RecurringPage,
})

function RecurringPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Recurring</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your fixed commitments. When one is due, the Dashboard will prompt you
        to confirm it — with the amount and date still editable.
      </p>
      <div className="mt-8">
        <RecurringManager />
      </div>
    </main>
  )
}
