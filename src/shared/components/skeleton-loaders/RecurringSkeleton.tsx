import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'

export function RecurringSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-2xl px-4 py-10"
    >
      <span className="sr-only">Loading recurring expenses</span>
      <h1 className="text-2xl font-semibold">Recurring</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your fixed commitments. When one is due, the Dashboard will prompt you
        to confirm it — with the amount and date still editable.
      </p>
      <div className="mt-8">
        <RecurringManagerSkeleton />
      </div>
    </main>
  )
}

function RecurringManagerSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Loading recurring expense templates</span>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Recurring expenses</h2>
        <Button disabled>Add Recurring Expense</Button>
      </div>

      <RecurringRowsSkeleton />
    </div>
  )
}

export function RecurringRowsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading recurring expense templates</span>
      <ul className="flex flex-col divide-y rounded-md border border-border">
        {Array.from({ length: 5 }, (_item, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-36 max-w-full" />
                <Skeleton className="mt-2 h-3 w-48 max-w-full" />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="size-8" />
              <Skeleton className="h-8 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
