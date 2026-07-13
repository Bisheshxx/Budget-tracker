import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-[98.5rem] px-4 py-6 lg:py-8"
    >
      <span className="sr-only">Loading dashboard</span>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:h-[calc(100dvh-260px)] lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-5 lg:pr-1">
          <SummaryCardSkeleton />
          <CategoriesCardSkeleton />
        </div>

        <TransactionsCardSkeleton />
      </div>
    </main>
  )
}

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-2 h-4 w-28" />
          </div>
          <Skeleton className="h-9 w-44" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_item, index) => (
            <div
              key={index}
              className="rounded-xl border border-border px-4 py-3"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-28" />
            </div>
          ))}
        </div>

        <div>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-3 h-3 w-full" />
          <div className="mt-3 flex flex-col gap-3">
            {Array.from({ length: 3 }, (_item, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Skeleton className="h-5 w-28 max-w-full" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CategoriesCardSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle>Categories</CardTitle>
          <Button type="button" variant="outline" disabled>
            New category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex max-h-80 flex-col divide-y overflow-hidden pr-1">
          {Array.from({ length: 6 }, (_item, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-2 py-2"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Skeleton className="size-3 shrink-0 rounded-full" />
                <Skeleton className="size-4 shrink-0" />
                <Skeleton className="h-4 w-28 max-w-full" />
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Skeleton className="size-8" />
                <Skeleton className="size-8" />
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function TransactionsCardSkeleton() {
  return (
    <Card className="flex min-h-0 flex-col lg:col-span-7">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle>Recent transactions</CardTitle>
          <Button type="button" disabled>
            Add transaction
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden">
        <TransactionsListSkeleton />
      </CardContent>
    </Card>
  )
}

export function TransactionsListSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Loading transactions</span>
      {Array.from({ length: 3 }, (_day, dayIndex) => (
        <div key={dayIndex}>
          <div className="mb-1 flex items-baseline justify-between border-b border-border pb-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {Array.from({ length: 3 }, (_row, rowIndex) => (
              <li key={rowIndex} className="flex items-center gap-2 py-3">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-5 w-32 max-w-full" />
                    <Skeleton className="mt-2 h-3 w-48 max-w-full" />
                  </div>
                  <Skeleton className="h-5 w-20 shrink-0" />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Skeleton className="size-8" />
                  <Skeleton className="size-8" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
